import test from 'node:test';
import assert from 'node:assert/strict';
import {
  copyNode,
  createFolder,
  cutNode,
  deleteNode,
  getInitialL4B5Fs,
  getInitialL4B5PracticeFs,
  getInitialL5B4Fs,
  getInitialL5B4PracticeFs,
  gradeL4B5Practice,
  gradeL5B4Practice,
  moveToNode,
  openFileLocation,
  openFolder,
  pasteNode,
  renameNode,
  searchInCurrentFolder,
  undoFs,
} from './virtualFs';

test('Copy -> Paste preserves source file and copies into destination', () => {
  let state = getInitialL4B5Fs();
  const copyRes = copyNode(state, 'file-gioithieu');
  assert.equal(copyRes.ok, true);
  state = copyRes.state;

  const pasteRes = pasteNode(state, 'nhom-2');
  assert.equal(pasteRes.ok, true);
  state = pasteRes.state;

  const inD = state.nodes.filter((n) => n.parentId === 'drive-d' && n.name === 'Gioi thieu.pptx');
  const inNhom2 = state.nodes.filter((n) => n.parentId === 'nhom-2' && n.name === 'Gioi thieu.pptx');
  assert.equal(inD.length, 1);
  assert.equal(inNhom2.length, 1);
});

test('Cut leaves source intact until Paste succeeds at destination', () => {
  let state = getInitialL4B5Fs();
  const cutRes = cutNode(state, 'thu-an');
  assert.equal(cutRes.ok, true);
  state = cutRes.state;

  // Before Paste: Thu An must still be in nhom-1
  const beforePaste = state.nodes.find((n) => n.id === 'thu-an');
  assert.equal(beforePaste?.parentId, 'nhom-1');

  const pasteRes = pasteNode(state, 'nhom-2');
  assert.equal(pasteRes.ok, true);
  state = pasteRes.state;

  const afterPaste = state.nodes.find((n) => n.id === 'thu-an');
  assert.equal(afterPaste?.parentId, 'nhom-2');
});

test('Delete and Undo restores deleted file', () => {
  let state = getInitialL4B5Fs();
  const delRes = deleteNode(state, 'file-nhap');
  assert.equal(delRes.ok, true);
  state = delRes.state;
  assert.equal(state.nodes.some((n) => n.id === 'file-nhap'), false);

  const undoRes = undoFs(state);
  assert.equal(undoRes.ok, true);
  state = undoRes.state;
  assert.equal(state.nodes.some((n) => n.id === 'file-nhap'), true);
});

test('System folder Windows (C:) cannot be deleted', () => {
  const state = getInitialL4B5Fs();
  const delRes = deleteNode(state, 'sys-win');
  assert.equal(delRes.ok, false);
});

test('L4-B5 free practice grader passes full workflow and fails if source removed', () => {
  let state = getInitialL4B5PracticeFs();
  // Create Bai tap inside Thu An
  let res = createFolder(state, 'Bai tap', 'thu-an');
  assert.equal(res.ok, true);
  state = res.state;
  const baiTapId = state.selectedNodeId!;

  // Copy Gioi thieu.pptx into Bai tap
  res = copyNode(state, 'file-gioithieu');
  state = res.state;
  res = pasteNode(state, baiTapId);
  assert.equal(res.ok, true);
  state = res.state;
  const copiedFileId = state.selectedNodeId!;

  // Move Bai tap to Nhom 2
  res = moveToNode(state, baiTapId, 'nhom-2');
  assert.equal(res.ok, true);
  state = res.state;

  // Rename copied file to Bai tap nhom.pptx
  res = renameNode(state, copiedFileId, 'Bai tap nhom.pptx');
  assert.equal(res.ok, true);
  state = res.state;

  const gradeOk = gradeL4B5Practice(state);
  assert.equal(gradeOk.passed, true);

  // If user deletes source file from D:, grader should fail source check
  res = deleteNode(state, 'file-gioithieu');
  const gradeFail = gradeL4B5Practice(res.state);
  assert.equal(gradeFail.passed, false);
});

test('L5-B4 scoped search only searches inside currently open folder', () => {
  let state = getInitialL5B4Fs();
  // Open An folder: Ho-Than-tho.jpg is in Khoa, so it should NOT appear
  state = openFolder(state, 'an-dir').state;
  const inAn = searchInCurrentFolder(state, 'Ho-Than-tho');
  assert.equal(inAn.results.length, 0);

  // Open Anh-Bai-tap-nhom: Ho-Than-tho.jpg IS inside Khoa (descendant), Ki-nghi-he.pptx is outside
  state = openFolder(inAn.state, 'anh-nhom').state;
  const inAnhNhom = searchInCurrentFolder(state, 'Ho-Than-tho');
  assert.equal(inAnhNhom.results.length, 1);
  assert.equal(inAnhNhom.results[0].node.name, 'Ho-Than-tho.jpg');

  const outsideSearch = searchInCurrentFolder(inAnhNhom.state, 'Ki-nghi-he');
  assert.equal(outsideSearch.results.length, 0);

  // Open file location jumps to Khoa
  const loc = openFileLocation(inAnhNhom.state, 'f-thantho');
  assert.equal(loc.ok, true);
  assert.equal(loc.state.currentFolderId, 'khoa-dir');
});

test('L5-B4 free practice grader accepts valid logical tree + search + open location', () => {
  let state = getInitialL5B4PracticeFs();
  const f1 = createFolder(state, 'Hinh-anh', 'ho-so');
  state = f1.state;
  const hinhAnhId = state.selectedNodeId!;

  const f2 = createFolder(state, 'Tai-lieu', 'ho-so');
  state = f2.state;
  const taiLieuId = state.selectedNodeId!;

  state = moveToNode(state, 'f-anh', hinhAnhId).state;
  state = moveToNode(state, 'f-tin', taiLieuId).state;
  state = moveToNode(state, 'f-chieu', taiLieuId).state;

  state = openFolder(state, 'ho-so').state;
  const sr = searchInCurrentFolder(state, 'Trinh-chieu');
  assert.equal(sr.results.length, 1);
  state = sr.state;
  state = openFileLocation(state, 'f-chieu').state;

  const grade = gradeL5B4Practice(state);
  assert.equal(grade.passed, true);
});
