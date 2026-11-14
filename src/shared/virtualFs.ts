import type { VirtualFsAction, VirtualFsNode, VirtualFsState } from './types';

export interface FsOpResult {
  ok: boolean;
  state: VirtualFsState;
  message: string;
  effect?: 'copied' | 'moved' | 'created' | 'renamed' | 'deleted' | 'undone' | 'cut_marked' | 'error';
}

function cloneNodes(nodes: VirtualFsNode[]): VirtualFsNode[] {
  return nodes.map((n) => ({ ...n }));
}

export function getInitialL4B5Fs(): VirtualFsState {
  const nodes: VirtualFsNode[] = [
    { id: 'drive-c', name: 'Win (C:)', type: 'drive', parentId: null, protected: true, systemImportant: true },
    { id: 'sys-win', name: 'Windows', type: 'folder', parentId: 'drive-c', protected: true, systemImportant: true },
    { id: 'drive-d', name: 'Du lieu (D:)', type: 'drive', parentId: null, protected: true },
    { id: 'lop-4a2', name: 'Lop 4A2', type: 'folder', parentId: 'drive-d', protected: true },
    { id: 'nhom-1', name: 'Nhom 1', type: 'folder', parentId: 'lop-4a2', protected: true },
    { id: 'nhom-2', name: 'Nhom 2', type: 'folder', parentId: 'lop-4a2', protected: true },
    { id: 'thu-an', name: 'Thu An', type: 'folder', parentId: 'nhom-1' },
    { id: 'dang-khoa', name: 'Dang Khoa', type: 'folder', parentId: 'nhom-1' },
    { id: 'tran-huy', name: 'Tran Huy', type: 'folder', parentId: 'nhom-2' },
    {
      id: 'file-gioithieu',
      name: 'Gioi thieu.pptx',
      type: 'file',
      fileKind: 'pptx',
      parentId: 'drive-d',
      sizeLabel: '245 KB',
      modifiedAt: '25/08/2025 14:30',
    },
    {
      id: 'file-nhap',
      name: 'Ban nhap cu.txt',
      type: 'file',
      fileKind: 'text',
      parentId: 'thu-an',
      sizeLabel: '4 KB',
      modifiedAt: '25/08/2025 14:35',
    },
  ];
  return {
    nodes,
    currentFolderId: 'drive-d',
    selectedNodeId: null,
    clipboard: null,
    searchQuery: '',
    searchScopeFolderId: null,
    actions: [],
    history: [],
  };
}

export function getInitialL4B5PracticeFs(): VirtualFsState {
  const nodes: VirtualFsNode[] = [
    { id: 'drive-c', name: 'Win (C:)', type: 'drive', parentId: null, protected: true, systemImportant: true },
    { id: 'sys-win', name: 'Windows', type: 'folder', parentId: 'drive-c', protected: true, systemImportant: true },
    { id: 'drive-d', name: 'Du lieu (D:)', type: 'drive', parentId: null, protected: true },
    { id: 'lop-4a2', name: 'Lop 4A2', type: 'folder', parentId: 'drive-d', protected: true },
    { id: 'nhom-1', name: 'Nhom 1', type: 'folder', parentId: 'lop-4a2', protected: true },
    { id: 'nhom-2', name: 'Nhom 2', type: 'folder', parentId: 'lop-4a2', protected: true },
    { id: 'thu-an', name: 'Thu An', type: 'folder', parentId: 'nhom-1' },
    {
      id: 'file-gioithieu',
      name: 'Gioi thieu.pptx',
      type: 'file',
      fileKind: 'pptx',
      parentId: 'drive-d',
      sizeLabel: '245 KB',
    },
    {
      id: 'file-anh',
      name: 'Anh the.jpg',
      type: 'file',
      fileKind: 'image',
      parentId: 'drive-d',
      sizeLabel: '180 KB',
    },
  ];
  return {
    nodes,
    currentFolderId: 'thu-an',
    selectedNodeId: null,
    clipboard: null,
    searchQuery: '',
    searchScopeFolderId: null,
    actions: [],
    history: [],
  };
}

export function getInitialL5B4Fs(): VirtualFsState {
  const nodes: VirtualFsNode[] = [
    { id: 'drive-d', name: 'Local Disk (D:)', type: 'drive', parentId: null, protected: true },
    { id: 'anh-nhom', name: 'Anh-Bai-tap-nhom', type: 'folder', parentId: 'drive-d', protected: true },
    { id: 'an-dir', name: 'An', type: 'folder', parentId: 'anh-nhom' },
    { id: 'khoa-dir', name: 'Khoa', type: 'folder', parentId: 'anh-nhom' },
    { id: 'minh-dir', name: 'Minh', type: 'folder', parentId: 'anh-nhom' },
    { id: 'f-camranh', name: 'San-bay-Cam-Ranh.jpg', type: 'file', fileKind: 'image', parentId: 'an-dir', sizeLabel: '420 KB' },
    { id: 'f-haiduong', name: 'Vien-Hai-Duong-hoc.jpg', type: 'file', fileKind: 'image', parentId: 'an-dir', sizeLabel: '390 KB' },
    { id: 'f-dalat', name: 'Cho-Da-Lat.jpg', type: 'file', fileKind: 'image', parentId: 'khoa-dir', sizeLabel: '510 KB' },
    { id: 'f-thantho', name: 'Ho-Than-tho.jpg', type: 'file', fileKind: 'image', parentId: 'khoa-dir', sizeLabel: '475 KB' },
    { id: 'f-chuottui', name: 'Chuot-tui.jpg', type: 'file', fileKind: 'image', parentId: 'minh-dir', sizeLabel: '330 KB' },
    { id: 'ho-so', name: 'Ho-so-hoc-tap', type: 'folder', parentId: 'drive-d', protected: true },
    { id: 'f-kinghihe', name: 'Ki-nghi-he.pptx', type: 'file', fileKind: 'pptx', parentId: 'ho-so', sizeLabel: '161 KB' },
  ];
  return {
    nodes,
    currentFolderId: 'drive-d',
    selectedNodeId: null,
    clipboard: null,
    searchQuery: '',
    searchScopeFolderId: null,
    actions: [],
    history: [],
  };
}

export function getInitialL5B4PracticeFs(): VirtualFsState {
  const nodes: VirtualFsNode[] = [
    { id: 'drive-d', name: 'Local Disk (D:)', type: 'drive', parentId: null, protected: true },
    { id: 'ho-so', name: 'Ho-so-cua-em', type: 'folder', parentId: 'drive-d', protected: true },
    { id: 'f-tin', name: 'Bai-tap-Tin-hoc.docx', type: 'file', fileKind: 'docx', parentId: 'ho-so', sizeLabel: '88 KB' },
    { id: 'f-anh', name: 'Phong-canh-que-huong.jpg', type: 'file', fileKind: 'image', parentId: 'ho-so', sizeLabel: '520 KB' },
    { id: 'f-chieu', name: 'Trinh-chieu-nhom.pptx', type: 'file', fileKind: 'pptx', parentId: 'ho-so', sizeLabel: '310 KB' },
  ];
  return {
    nodes,
    currentFolderId: 'ho-so',
    selectedNodeId: null,
    clipboard: null,
    searchQuery: '',
    searchScopeFolderId: null,
    actions: [],
    history: [],
  };
}

export function getChildren(nodes: VirtualFsNode[], folderId: string): VirtualFsNode[] {
  return nodes
    .filter((n) => n.parentId === folderId)
    .sort((a, b) => {
      if (a.type !== b.type) {
        if (a.type === 'folder' || a.type === 'drive') return -1;
        return 1;
      }
      return a.name.localeCompare(b.name, 'vi');
    });
}

export function getBreadcrumb(nodes: VirtualFsNode[], folderId: string): VirtualFsNode[] {
  const path: VirtualFsNode[] = [];
  let curr = nodes.find((n) => n.id === folderId);
  const guard = new Set<string>();
  while (curr && !guard.has(curr.id)) {
    guard.add(curr.id);
    path.unshift(curr);
    curr = curr.parentId ? nodes.find((n) => n.id === curr!.parentId) : undefined;
  }
  return path;
}

export function getPathString(nodes: VirtualFsNode[], nodeId: string): string {
  return getBreadcrumb(nodes, nodeId)
    .map((n) => n.name)
    .join(' > ');
}

export function isDescendant(nodes: VirtualFsNode[], candidateId: string, ancestorId: string): boolean {
  let curr = nodes.find((n) => n.id === candidateId);
  const guard = new Set<string>();
  while (curr && curr.parentId && !guard.has(curr.id)) {
    if (curr.parentId === ancestorId) return true;
    guard.add(curr.id);
    curr = nodes.find((n) => n.id === curr!.parentId);
  }
  return false;
}

function collectSubtreeIds(nodes: VirtualFsNode[], rootId: string): string[] {
  const result = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const child of nodes) {
      if (child.parentId === id) {
        result.push(child.id);
        queue.push(child.id);
      }
    }
  }
  return result;
}

function pushHistory(state: VirtualFsState): VirtualFsNode[][] {
  return [...state.history.slice(-14), cloneNodes(state.nodes)];
}

function appendAction(state: VirtualFsState, action: Omit<VirtualFsAction, 'timestamp'>): VirtualFsAction[] {
  return [...state.actions, { ...action, timestamp: Date.now() }];
}

function makeUniqueId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function openFolder(state: VirtualFsState, folderId: string): FsOpResult {
  const target = state.nodes.find((n) => n.id === folderId && (n.type === 'folder' || n.type === 'drive'));
  if (!target) {
    return { ok: false, state, message: 'Không tìm thấy thư mục này.', effect: 'error' };
  }
  return {
    ok: true,
    state: {
      ...state,
      currentFolderId: target.id,
      selectedNodeId: null,
      searchQuery: '',
      searchScopeFolderId: null,
      actions: appendAction(state, { type: 'open_folder', targetId: target.id }),
    },
    message: `Đã mở thư mục ${target.name}.`,
  };
}

export function selectNode(state: VirtualFsState, nodeId: string | null): VirtualFsState {
  return { ...state, selectedNodeId: nodeId };
}

export function createFolder(state: VirtualFsState, folderName: string, parentId = state.currentFolderId): FsOpResult {
  const trimmed = folderName.trim();
  if (!trimmed) {
    return { ok: false, state, message: 'Tên thư mục không được để trống.', effect: 'error' };
  }
  if (/[\\/:*?"<>|]/.test(trimmed)) {
    return { ok: false, state, message: 'Tên thư mục không được chứa kí tự đặc biệt (\\ / : * ? " < > |).', effect: 'error' };
  }
  const parent = state.nodes.find((n) => n.id === parentId && (n.type === 'folder' || n.type === 'drive'));
  if (!parent) {
    return { ok: false, state, message: 'Không tìm thấy thư mục cha để tạo.', effect: 'error' };
  }
  if (parent.systemImportant) {
    return {
      ok: false,
      state,
      message: 'Không nên tự ý tạo hoặc sửa trong thư mục hệ thống Windows (C:). Hãy thực hành ở ổ Du lieu (D:).',
      effect: 'error',
    };
  }
  const dup = state.nodes.find(
    (n) => n.parentId === parentId && n.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (dup) {
    return { ok: false, state, message: `Đã có mục tên "${trimmed}" trong ${parent.name}. Hãy đặt tên khác.`, effect: 'error' };
  }

  const newNode: VirtualFsNode = {
    id: makeUniqueId('fld'),
    name: trimmed,
    type: 'folder',
    parentId,
    modifiedAt: 'Vừa xong',
  };
  return {
    ok: true,
    state: {
      ...state,
      history: pushHistory(state),
      nodes: [...state.nodes, newNode],
      selectedNodeId: newNode.id,
      actions: appendAction(state, { type: 'create_folder', targetId: newNode.id, destinationId: parentId, newName: trimmed }),
    },
    message: `Đã tạo thư mục "${trimmed}" trong ${parent.name}.`,
    effect: 'created',
  };
}

export function renameNode(state: VirtualFsState, nodeId: string, newName: string): FsOpResult {
  const node = state.nodes.find((n) => n.id === nodeId);
  if (!node) return { ok: false, state, message: 'Hãy chọn một tệp hoặc thư mục trước khi đổi tên.', effect: 'error' };
  if (node.protected || node.systemImportant || node.type === 'drive') {
    return { ok: false, state, message: `Không thể đổi tên "${node.name}" vì đây là mục cố định của bài thực hành.`, effect: 'error' };
  }
  const trimmed = newName.trim();
  if (!trimmed) return { ok: false, state, message: 'Tên mới không được để trống.', effect: 'error' };
  if (/[\\/:*?"<>|]/.test(trimmed)) {
    return { ok: false, state, message: 'Tên không được chứa kí tự đặc biệt (\\ / : * ? " < > |).', effect: 'error' };
  }
  const dup = state.nodes.find(
    (n) => n.parentId === node.parentId && n.id !== node.id && n.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (dup) {
    return { ok: false, state, message: `Đã tồn tại "${trimmed}" trong cùng thư mục.`, effect: 'error' };
  }
  const updated = state.nodes.map((n) => (n.id === nodeId ? { ...n, name: trimmed, modifiedAt: 'Vừa xong' } : n));
  return {
    ok: true,
    state: {
      ...state,
      history: pushHistory(state),
      nodes: updated,
      actions: appendAction(state, { type: 'rename', targetId: nodeId, newName: trimmed }),
    },
    message: `Đã đổi tên "${node.name}" thành "${trimmed}".`,
    effect: 'renamed',
  };
}

export function copyNode(state: VirtualFsState, nodeId: string): FsOpResult {
  const node = state.nodes.find((n) => n.id === nodeId);
  if (!node || node.type === 'drive') {
    return { ok: false, state, message: 'Hãy chọn tệp hoặc thư mục cần Sao chép (Copy).', effect: 'error' };
  }
  return {
    ok: true,
    state: {
      ...state,
      clipboard: { mode: 'copy', nodeId: node.id, sourceParentId: node.parentId },
      actions: appendAction(state, { type: 'copy', targetId: node.id }),
    },
    message: `Đã ghi nhớ sao chép "${node.name}". Hãy mở thư mục đích rồi bấm Dán (Paste).`,
    effect: 'copied',
  };
}

export function cutNode(state: VirtualFsState, nodeId: string): FsOpResult {
  const node = state.nodes.find((n) => n.id === nodeId);
  if (!node || node.type === 'drive') {
    return { ok: false, state, message: 'Hãy chọn tệp hoặc thư mục cần Cắt (Cut).', effect: 'error' };
  }
  if (node.systemImportant || node.protected) {
    return { ok: false, state, message: `Không thể di chuyển "${node.name}" vì là mục cố định của hệ thống/lớp học.`, effect: 'error' };
  }
  // Cut ONLY marks clipboard; source stays in place until Paste succeeds!
  return {
    ok: true,
    state: {
      ...state,
      clipboard: { mode: 'cut', nodeId: node.id, sourceParentId: node.parentId },
      actions: appendAction(state, { type: 'cut', targetId: node.id }),
    },
    message: `Đã chọn Cắt "${node.name}" (vẫn còn ở thư mục nguồn cho tới khi Dán thành công).`,
    effect: 'cut_marked',
  };
}

export function pasteNode(
  state: VirtualFsState,
  destinationFolderId = state.currentFolderId,
  options?: { allowAutoRename?: boolean },
): FsOpResult {
  if (!state.clipboard) {
    return { ok: false, state, message: 'Chưa có tệp hoặc thư mục nào được Sao chép (Copy) hoặc Cắt (Cut).', effect: 'error' };
  }
  const source = state.nodes.find((n) => n.id === state.clipboard!.nodeId);
  if (!source) {
    return { ok: false, state, message: 'Mục nguồn không còn tồn tại.', effect: 'error' };
  }
  const dest = state.nodes.find((n) => n.id === destinationFolderId && (n.type === 'folder' || n.type === 'drive'));
  if (!dest) {
    return { ok: false, state, message: 'Thư mục đích không hợp lệ.', effect: 'error' };
  }
  if (dest.systemImportant) {
    return { ok: false, state, message: 'Không nên dán tệp vào thư mục hệ thống Windows (C:).', effect: 'error' };
  }
  if (source.id === dest.id || isDescendant(state.nodes, dest.id, source.id)) {
    return { ok: false, state, message: 'Không thể dán một thư mục vào chính nó hoặc thư mục con của nó.', effect: 'error' };
  }

  const existingDup = state.nodes.find(
    (n) => n.parentId === dest.id && n.id !== source.id && n.name.toLowerCase() === source.name.toLowerCase(),
  );

  if (state.clipboard.mode === 'cut') {
    if (source.parentId === dest.id) {
      return { ok: false, state, message: `"${source.name}" đang nằm sẵn trong "${dest.name}". Hãy mở thư mục khác rồi Dán.`, effect: 'error' };
    }
    if (existingDup) {
      return {
        ok: false,
        state,
        message: `Thư mục "${dest.name}" đã có "${source.name}". Hãy đổi tên hoặc xóa bản trùng trước khi di chuyển.`,
        effect: 'error',
      };
    }
    const updated = state.nodes.map((n) =>
      n.id === source.id ? { ...n, parentId: dest.id, modifiedAt: 'Vừa xong' } : n,
    );
    return {
      ok: true,
      state: {
        ...state,
        history: pushHistory(state),
        nodes: updated,
        clipboard: null,
        selectedNodeId: source.id,
        actions: appendAction(state, { type: 'paste', targetId: source.id, destinationId: dest.id }),
      },
      message: `Đã di chuyển "${source.name}" sang "${dest.name}" thành công!`,
      effect: 'moved',
    };
  }

  // Copy mode: clone subtree into destination, preserving source!
  let targetName = source.name;
  if (existingDup) {
    if (!options?.allowAutoRename) {
      return {
        ok: false,
        state,
        message: `Trong "${dest.name}" đã có "${source.name}". Hãy chọn thư mục đích khác hoặc bật đổi tên bản sao.`,
        effect: 'error',
      };
    }
    const dotIdx = source.name.lastIndexOf('.');
    targetName =
      dotIdx > 0
        ? `${source.name.slice(0, dotIdx)} - Copy${source.name.slice(dotIdx)}`
        : `${source.name} - Copy`;
  }

  const subtreeIds = collectSubtreeIds(state.nodes, source.id);
  const idMap = new Map<string, string>();
  for (const oldId of subtreeIds) {
    idMap.set(oldId, makeUniqueId(oldId.startsWith('file') ? 'file' : 'fld'));
  }

  const clones: VirtualFsNode[] = subtreeIds.map((oldId) => {
    const orig = state.nodes.find((n) => n.id === oldId)!;
    const isRootClone = oldId === source.id;
    return {
      ...orig,
      id: idMap.get(oldId)!,
      name: isRootClone ? targetName : orig.name,
      parentId: isRootClone ? dest.id : idMap.get(orig.parentId!)!,
      protected: false,
      modifiedAt: 'Vừa xong',
    };
  });

  const rootCloneId = idMap.get(source.id)!;
  return {
    ok: true,
    state: {
      ...state,
      history: pushHistory(state),
      nodes: [...state.nodes, ...clones],
      selectedNodeId: rootCloneId,
      actions: appendAction(state, { type: 'paste', targetId: rootCloneId, destinationId: dest.id }),
    },
    message: `Đúng rồi! "${targetName}" đã được sao chép vào "${dest.name}" và vẫn còn ở thư mục nguồn.`,
    effect: 'copied',
  };
}

export function moveToNode(state: VirtualFsState, nodeId: string, destinationFolderId: string): FsOpResult {
  const source = state.nodes.find((n) => n.id === nodeId);
  if (!source || source.type === 'drive') {
    return { ok: false, state, message: 'Hãy chọn tệp hoặc thư mục cần di chuyển.', effect: 'error' };
  }
  if (source.systemImportant || source.protected) {
    return { ok: false, state, message: `Không thể di chuyển "${source.name}" vì là mục cố định.`, effect: 'error' };
  }
  const dest = state.nodes.find((n) => n.id === destinationFolderId && (n.type === 'folder' || n.type === 'drive'));
  if (!dest) {
    return { ok: false, state, message: 'Thư mục đích không hợp lệ.', effect: 'error' };
  }
  if (dest.systemImportant) {
    return { ok: false, state, message: 'Không nên di chuyển tệp vào thư mục hệ thống Windows (C:).', effect: 'error' };
  }
  if (source.id === dest.id || isDescendant(state.nodes, dest.id, source.id)) {
    return { ok: false, state, message: 'Không thể di chuyển thư mục vào chính nó hoặc thư mục con của nó.', effect: 'error' };
  }
  if (source.parentId === dest.id) {
    return { ok: false, state, message: `"${source.name}" đã nằm trong "${dest.name}" rồi.`, effect: 'error' };
  }
  const existingDup = state.nodes.find(
    (n) => n.parentId === dest.id && n.id !== source.id && n.name.toLowerCase() === source.name.toLowerCase(),
  );
  if (existingDup) {
    return { ok: false, state, message: `Trong "${dest.name}" đã có mục tên "${source.name}".`, effect: 'error' };
  }
  const updated = state.nodes.map((n) =>
    n.id === source.id ? { ...n, parentId: dest.id, modifiedAt: 'Vừa xong' } : n,
  );
  return {
    ok: true,
    state: {
      ...state,
      history: pushHistory(state),
      nodes: updated,
      selectedNodeId: source.id,
      actions: appendAction(state, { type: 'move_to', targetId: source.id, destinationId: dest.id }),
    },
    message: `Đã di chuyển "${source.name}" sang "${dest.name}". Các tệp con bên trong cũng di chuyển theo!`,
    effect: 'moved',
  };
}

export function deleteNode(state: VirtualFsState, nodeId: string): FsOpResult {
  const node = state.nodes.find((n) => n.id === nodeId);
  if (!node) {
    return { ok: false, state, message: 'Hãy chọn tệp hoặc thư mục cần xóa.', effect: 'error' };
  }
  if (node.systemImportant || node.type === 'drive') {
    return {
      ok: false,
      state,
      message: `Cảnh báo an toàn: Không được xóa "${node.name}" vì là thư mục hệ thống máy tính, xóa nhầm sẽ gây lỗi chương trình!`,
      effect: 'error',
    };
  }
  if (node.protected) {
    return { ok: false, state, message: `Thư mục "${node.name}" là thư mục dùng chung của lớp, không được xóa.`, effect: 'error' };
  }
  const toDelete = new Set(collectSubtreeIds(state.nodes, node.id));
  const remaining = state.nodes.filter((n) => !toDelete.has(n.id));
  const nextCurrent = toDelete.has(state.currentFolderId) ? node.parentId ?? 'drive-d' : state.currentFolderId;
  return {
    ok: true,
    state: {
      ...state,
      history: pushHistory(state),
      nodes: remaining,
      currentFolderId: nextCurrent,
      selectedNodeId: null,
      clipboard: state.clipboard && toDelete.has(state.clipboard.nodeId) ? null : state.clipboard,
      actions: appendAction(state, { type: 'delete', targetId: node.id }),
    },
    message: `Đã xóa "${node.name}". Nếu xóa nhầm, em có thể bấm Hoàn tác (Undo) ngay!`,
    effect: 'deleted',
  };
}

export function undoFs(state: VirtualFsState): FsOpResult {
  if (state.history.length === 0) {
    return { ok: false, state, message: 'Chưa có thao tác nào để Hoàn tác.', effect: 'error' };
  }
  const prevNodes = state.history[state.history.length - 1];
  const existsCurrent = prevNodes.some((n) => n.id === state.currentFolderId);
  return {
    ok: true,
    state: {
      ...state,
      nodes: cloneNodes(prevNodes),
      history: state.history.slice(0, -1),
      currentFolderId: existsCurrent ? state.currentFolderId : prevNodes[0]?.id ?? 'drive-d',
      selectedNodeId: null,
      actions: appendAction(state, { type: 'undo' }),
    },
    message: 'Đã hoàn tác lại trạng thái trước đó!',
    effect: 'undone',
  };
}

export function searchInCurrentFolder(state: VirtualFsState, query: string): {
  state: VirtualFsState;
  results: Array<{ node: VirtualFsNode; path: string }>;
  scopeFolderName: string;
} {
  const scopeId = state.currentFolderId;
  const scopeFolder = state.nodes.find((n) => n.id === scopeId);
  const trimmed = query.trim().toLowerCase();
  const nextState: VirtualFsState = {
    ...state,
    searchQuery: query,
    searchScopeFolderId: scopeId,
    actions: appendAction(state, { type: 'search', targetId: scopeId, query: query.trim() }),
  };

  if (!trimmed) {
    return { state: nextState, results: [], scopeFolderName: scopeFolder?.name ?? '' };
  }

  // Only search within scopeId descendants!
  const descendantIds = new Set(collectSubtreeIds(state.nodes, scopeId));
  descendantIds.delete(scopeId);

  const results = state.nodes
    .filter((n) => descendantIds.has(n.id) && n.name.toLowerCase().includes(trimmed))
    .map((node) => ({
      node,
      path: getPathString(state.nodes, node.parentId ?? scopeId),
    }));

  return { state: nextState, results, scopeFolderName: scopeFolder?.name ?? '' };
}

export function openFileLocation(state: VirtualFsState, nodeId: string): FsOpResult {
  const node = state.nodes.find((n) => n.id === nodeId);
  if (!node || !node.parentId) {
    return { ok: false, state, message: 'Không tìm thấy vị trí thư mục chứa tệp.', effect: 'error' };
  }
  const parent = state.nodes.find((n) => n.id === node.parentId);
  return {
    ok: true,
    state: {
      ...state,
      currentFolderId: node.parentId,
      selectedNodeId: node.id,
      searchQuery: '',
      searchScopeFolderId: null,
      actions: appendAction(state, { type: 'open_file_location', targetId: node.id, destinationId: node.parentId }),
    },
    message: `Đã mở thư mục "${parent?.name}" chứa "${node.name}".`,
  };
}

/**
 * Grader for L4 Bài 5 "Tự làm" (Free Practice):
 * Yêu cầu:
 * 1. Tạo thư mục con tên "Bai tap" trong thư mục Thu An (hoặc trong Nhom 2 sau khi chuyển).
 * 2. Sao chép tệp "Gioi thieu.pptx" vào thư mục "Bai tap" (và vẫn giữ "Gioi thieu.pptx" ở ổ D:!).
 * 3. Di chuyển thư mục "Bai tap" sang thư mục "Nhom 2" (không còn ở trong Thu An nữa).
 * 4. Đổi tên bản sao tệp trong "Bai tap" thành "Bai tap nhom.pptx" (chấp nhận có hoặc không có đuôi .pptx nếu rõ nghĩa).
 */
export function gradeL4B5Practice(state: VirtualFsState): {
  passed: boolean;
  checks: { id: string; label: string; ok: boolean; hint: string }[];
  feedback: string;
} {
  const nhom2 = state.nodes.find((n) => n.id === 'nhom-2');
  const thuAn = state.nodes.find((n) => n.id === 'thu-an');
  const driveD = state.nodes.find((n) => n.id === 'drive-d');

  const baiTapInNhom2 = state.nodes.find(
    (n) => n.type === 'folder' && n.parentId === nhom2?.id && n.name.toLowerCase() === 'bai tap',
  );
  const baiTapStillInThuAn = state.nodes.find(
    (n) => n.type === 'folder' && n.parentId === thuAn?.id && n.name.toLowerCase() === 'bai tap',
  );

  const sourcePreserved = state.nodes.some(
    (n) => n.type === 'file' && n.parentId === driveD?.id && n.name.toLowerCase() === 'gioi thieu.pptx',
  );

  const filesInsideBaiTap = baiTapInNhom2
    ? state.nodes.filter((n) => n.parentId === baiTapInNhom2.id && n.type === 'file')
    : [];

  const hasRenamedFile = filesInsideBaiTap.some((f) => {
    const low = f.name.toLowerCase();
    return low === 'bai tap nhom.pptx' || low === 'bai tap nhom';
  });

  const hasAnyCopiedFile = filesInsideBaiTap.length > 0;

  const checks = [
    {
      id: 'source-preserved',
      label: 'Tệp nguồn "Gioi thieu.pptx" vẫn còn nguyên ở ổ Du lieu (D:)',
      ok: sourcePreserved,
      hint: 'Khi sao chép, em dùng Copy (không dùng Cut/Move) để giữ nguyên tệp gốc ở ổ D:.',
    },
    {
      id: 'folder-moved',
      label: 'Thư mục "Bai tap" nằm trong "Nhom 2" và không còn ở "Thu An"',
      ok: Boolean(baiTapInNhom2) && !baiTapStillInThuAn,
      hint: 'Tạo "Bai tap" rồi dùng "Di chuyển đến" (Move to) hoặc "Cắt → Dán" (Cut → Paste) để chuyển sang Nhom 2.',
    },
    {
      id: 'file-inside',
      label: 'Bên trong "Bai tap" có tệp trình chiếu đã sao chép',
      ok: hasAnyCopiedFile,
      hint: 'Mở ổ D:, chọn "Gioi thieu.pptx", bấm Sao chép rồi mở "Bai tap" bấm Dán.',
    },
    {
      id: 'file-renamed',
      label: 'Tệp bên trong "Bai tap" được đổi tên thành "Bai tap nhom.pptx"',
      ok: hasRenamedFile,
      hint: 'Chọn tệp trong "Bai tap", bấm Đổi tên (Rename) thành "Bai tap nhom.pptx".',
    },
  ];

  const passed = checks.every((c) => c.ok);
  const firstFail = checks.find((c) => !c.ok);
  return {
    passed,
    checks,
    feedback: passed
      ? 'Tuyệt vời! Cây thư mục đích và nội dung tệp bên trong hoàn toàn chính xác.'
      : `Chưa hoàn thành: ${firstFail?.hint}`,
  };
}

/**
 * Grader for L5 Bài 4 "Tự làm" (Free Practice):
 * Yêu cầu:
 * 1. Trong thư mục "Ho-so-cua-em", tạo ít nhất 2 thư mục con phân loại hợp lí (ví dụ theo loại tệp: Van-ban, Hinh-anh, Trinh-chieu hoặc theo môn học).
 * 2. Xếp cả 3 tệp gốc vào các thư mục con (không còn tệp nằm lộn xộn trực tiếp ở "Ho-so-cua-em").
 * 3. Các tệp có phần mở rộng cùng loại hoặc phân loại nhất quán (mỗi tệp đã vào thư mục con, không bỏ trống tệp).
 * 4. Đã thực hiện tìm kiếm tệp bằng ô Tìm kiếm và dùng "Mở vị trí tệp" hoặc mở đúng thư mục chứa tệp mục tiêu "Trinh-chieu-nhom.pptx".
 */
export function gradeL5B4Practice(state: VirtualFsState): {
  passed: boolean;
  checks: { id: string; label: string; ok: boolean; hint: string }[];
  feedback: string;
} {
  const hoSo = state.nodes.find((n) => n.id === 'ho-so');
  const subFolders = state.nodes.filter((n) => n.type === 'folder' && n.parentId === hoSo?.id);
  const subFolderIds = new Set(subFolders.map((f) => f.id));

  const targetFiles = ['f-tin', 'f-anh', 'f-chieu']
    .map((id) => state.nodes.find((n) => n.id === id))
    .filter((n): n is VirtualFsNode => Boolean(n));

  const allMovedIntoSubfolders =
    targetFiles.length === 3 && targetFiles.every((f) => f.parentId !== null && subFolderIds.has(f.parentId));

  // Verify reasonable grouping: distinct file kinds aren't all dumped into a single folder if >1 subfolder exists, OR if 3 folders exist each has its file
  const distinctParents = new Set(targetFiles.map((f) => f.parentId));
  const wellOrganized = subFolders.length >= 2 && allMovedIntoSubfolders && distinctParents.size >= 2;

  const usedSearch = state.actions.some((a) => a.type === 'search' && (a.query?.trim().length ?? 0) >= 2);
  const openedLocation =
    state.actions.some((a) => a.type === 'open_file_location' && a.targetId === 'f-chieu') ||
    (state.selectedNodeId === 'f-chieu' && usedSearch);

  const checks = [
    {
      id: 'subfolders-created',
      label: 'Tạo ít nhất 2 thư mục con rõ nghĩa trong "Ho-so-cua-em" (vd: Van-ban, Hinh-anh, Trinh-chieu)',
      ok: subFolders.length >= 2,
      hint: 'Trong "Ho-so-cua-em", bấm "Tạo thư mục" để tạo các thư mục phân loại.',
    },
    {
      id: 'files-organized',
      label: 'Phân loại và di chuyển cả 3 tệp vào các thư mục con phù hợp',
      ok: wellOrganized,
      hint: 'Di chuyển 3 tệp vào ít nhất 2 thư mục con theo loại tệp hoặc chủ đề, không để nằm ngoài.',
    },
    {
      id: 'search-used',
      label: 'Dùng ô Tìm kiếm ở thư mục "Ho-so-cua-em" để tìm "Trinh-chieu-nhom"',
      ok: usedSearch,
      hint: 'Mở "Ho-so-cua-em", gõ tên tệp vào ô Tìm kiếm rồi bấm Tìm.',
    },
    {
      id: 'location-opened',
      label: 'Mở vị trí tệp "Trinh-chieu-nhom.pptx" từ kết quả tìm kiếm',
      ok: openedLocation,
      hint: 'Trong kết quả tìm kiếm, bấm nút "Mở vị trí tệp" ở dòng Trinh-chieu-nhom.pptx.',
    },
  ];

  const passed = checks.every((c) => c.ok);
  const firstFail = checks.find((c) => !c.ok);
  return {
    passed,
    checks,
    feedback: passed
      ? 'Xuất sắc! Cây thư mục của em rất khoa học và em đã biết tìm kiếm đúng phạm vi.'
      : `Cần làm thêm: ${firstFail?.hint}`,
  };
}
