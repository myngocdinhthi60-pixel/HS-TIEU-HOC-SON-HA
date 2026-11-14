import fs from 'node:fs/promises';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { getHoChiMinhWeekKey } from '../src/shared/grading';
import { DEMO_STUDENTS_SEED } from '../server/seedData';
import { getFirebaseBridge, initFirebaseBridge, resetStoreWithSeed } from '../server/store';

async function generateSampleImportFiles() {
  const seedDir = path.resolve(process.cwd(), 'seed');
  await fs.mkdir(seedDir, { recursive: true });

  const rows = [
    ['Mã học sinh', 'Họ và tên', 'Giới tính', 'Lớp', 'Mã PIN'],
    ['HS011', 'Nguyễn Bảo An', 'Nữ', '4A2', '012345'],
    ['HS012', 'Nguyễn Bảo An', 'Nam', '4A2', '007890'],
    ['HS013', 'Trần Hoàng Minh', 'Nam', '4A2', ''],
    ['HS305', 'Lê Ngọc Hân', 'Nữ', '3A1', '045678'],
    ['HS505', 'Phạm Gia Bảo', 'Nam', '5A1', '090123'],
  ];

  // Excel .xlsx with Text format '@' on studentCode & PIN columns so leading zeros are preserved
  const ws = XLSX.utils.aoa_to_sheet(rows);
  for (let r = 1; r < rows.length; r++) {
    for (const c of [0, 4]) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) {
        ws[ref].t = 's';
        ws[ref].z = '@';
      }
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');
  const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  await fs.writeFile(path.join(seedDir, 'mau-nhap-hoc-sinh.xlsx'), xlsxBuf);

  // CSV UTF-8 with BOM
  const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\n') + '\n';
  await fs.writeFile(path.join(seedDir, 'mau-nhap-hoc-sinh.csv'), csvContent, 'utf8');
}

async function syncToFirebaseEmulatorIfActive(db: Awaited<ReturnType<typeof resetStoreWithSeed>>) {
  initFirebaseBridge();
  const bridge = getFirebaseBridge();
  if (bridge.mode !== 'firebase') {
    console.log('[Seed] Chế độ local-emulator-fallback: Đã lưu store vào .local-emulator-data/store.json');
    return;
  }

  if (bridge.auth) {
    for (const t of Object.values(db.teacherCredentials)) {
      const u = db.users[t.uid];
      try {
        await bridge.auth.getUser(t.uid);
      } catch {
        await bridge.auth.createUser({
          uid: t.uid,
          email: t.email,
          password: 'GiaoVien@2026',
          displayName: u.fullName,
        });
      }
      await bridge.auth.setCustomUserClaims(t.uid, {
        role: 'teacher',
        assignedClassIds: u.assignedClassIds,
      });
    }
    for (const s of DEMO_STUDENTS_SEED) {
      try {
        await bridge.auth.getUser(s.uid);
      } catch {
        await bridge.auth.createUser({
          uid: s.uid,
          displayName: s.nickname,
        });
      }
      await bridge.auth.setCustomUserClaims(s.uid, {
        role: 'student',
        classId: s.classId,
      });
    }
    console.log('[Seed] Đã đồng bộ tài khoản lên Firebase Auth Emulator.');
  }

  if (bridge.firestore) {
    const batch = bridge.firestore.batch();
    for (const [id, cls] of Object.entries(db.classes)) {
      batch.set(bridge.firestore.collection('classes').doc(id), cls);
    }
    for (const [id, lesson] of Object.entries(db.lessons)) {
      batch.set(bridge.firestore.collection('lessons').doc(id), lesson);
    }
    for (const [id, user] of Object.entries(db.users)) {
      batch.set(bridge.firestore.collection('users').doc(id), user);
    }
    for (const [id, asg] of Object.entries(db.assignments)) {
      batch.set(bridge.firestore.collection('assignments').doc(id), asg);
    }
    await batch.commit();
    console.log('[Seed] Đã đồng bộ collections lên Firestore Emulator.');
  }

  if (bridge.rtdb) {
    const weekKey = getHoChiMinhWeekKey();
    await bridge.rtdb.ref(`leaderboards/class-4a2/${weekKey}`).set(db.rtdbLeaderboards['class-4a2']?.[weekKey] ?? {});
    console.log('[Seed] Đã đồng bộ leaderboard lên RTDB Emulator.');
  }
}

async function main() {
  const db = await resetStoreWithSeed();
  await generateSampleImportFiles();
  await syncToFirebaseEmulatorIfActive(db);
  console.log(
    `[Seed] Hoàn tất: ${Object.keys(db.classes).length} lớp, ${
      Object.values(db.users).filter((u) => u.role === 'student').length
    } học sinh giả, ${Object.keys(db.lessons).length} mục bài SGK, và 2 tệp mẫu trong seed/.`,
  );
}

main().catch((err) => {
  console.error('[Seed] Lỗi:', err);
  process.exit(1);
});
