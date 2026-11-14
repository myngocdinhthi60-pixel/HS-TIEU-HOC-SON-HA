import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Pencil,
  Scissors,
  Search,
  ShieldAlert,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {
  copyNode,
  createFolder,
  cutNode,
  deleteNode,
  getBreadcrumb,
  getChildren,
  openFileLocation,
  openFolder,
  pasteNode,
  renameNode,
  moveToNode,
  searchInCurrentFolder,
  selectNode,
  undoFs,
  type FsOpResult,
} from '../../shared/virtualFs';
import type { VirtualFsNode, VirtualFsState } from '../../shared/types';

interface FolderSimulatorProps {
  fsState: VirtualFsState;
  onChange: (next: VirtualFsState) => void;
  highlightTarget?: string;
  enableSearch?: boolean;
  lowSpec2D?: boolean;
}

function FileIcon({ node }: { node: VirtualFsNode }) {
  if (node.type === 'drive') {
    return <HardDrive className="w-5 h-5 text-slate-600 dark:text-slate-300 shrink-0" />;
  }
  if (node.type === 'folder') {
    return <Folder className="w-5 h-5 text-amber-500 dark:text-amber-400 fill-amber-100 dark:fill-amber-900/50 shrink-0" />;
  }
  if (node.fileKind === 'pptx') {
    return <FileSpreadsheet className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />;
  }
  if (node.fileKind === 'image') {
    return <FileImage className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />;
  }
  return <FileText className="w-5 h-5 text-slate-600 dark:text-slate-300 shrink-0" />;
}

export const FolderSimulator: React.FC<FolderSimulatorProps> = ({
  fsState,
  onChange,
  highlightTarget,
  enableSearch = true,
}) => {
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'rename' | 'move' | 'delete' | null>(null);
  const [inputName, setInputName] = useState('');
  const [moveDestId, setMoveDestId] = useState('');
  const [searchInput, setSearchInput] = useState(fsState.searchQuery || '');
  const [searchResults, setSearchResults] = useState<Array<{ node: VirtualFsNode; path: string }> | null>(null);
  const [searchScopeName, setSearchScopeName] = useState('');
  const [copyBanner, setCopyBanner] = useState<{ srcName: string; destName: string } | null>(null);

  const selectedNode = useMemo(
    () => fsState.nodes.find((n) => n.id === fsState.selectedNodeId) ?? null,
    [fsState.nodes, fsState.selectedNodeId],
  );

  const currentFolder = useMemo(
    () => fsState.nodes.find((n) => n.id === fsState.currentFolderId) ?? fsState.nodes[0],
    [fsState.nodes, fsState.currentFolderId],
  );

  const breadcrumbs = useMemo(
    () => getBreadcrumb(fsState.nodes, fsState.currentFolderId),
    [fsState.nodes, fsState.currentFolderId],
  );

  const children = useMemo(
    () => getChildren(fsState.nodes, fsState.currentFolderId),
    [fsState.nodes, fsState.currentFolderId],
  );

  const folderOptions = useMemo(
    () => fsState.nodes.filter((n) => (n.type === 'folder' || n.type === 'drive') && !n.systemImportant),
    [fsState.nodes],
  );

  const applyResult = (res: FsOpResult, extra?: { isCopyPaste?: boolean; srcName?: string; destName?: string }) => {
    setFeedback({ ok: res.ok, text: res.message });
    if (res.ok) {
      onChange(res.state);
      if (extra?.isCopyPaste && extra.srcName && extra.destName) {
        setCopyBanner({ srcName: extra.srcName, destName: extra.destName });
      }
    }
  };

  const handleOpenFolder = (folderId: string) => {
    const res = openFolder(fsState, folderId);
    setSearchResults(null);
    setSearchInput('');
    if (res.ok) {
      onChange(res.state);
      setFeedback({ ok: true, text: res.message });
    }
  };

  const handleCopy = () => {
    if (!selectedNode) {
      setFeedback({ ok: false, text: 'Em hãy bấm chọn một tệp hoặc thư mục trước khi bấm Sao chép.' });
      return;
    }
    setCopyBanner(null);
    applyResult(copyNode(fsState, selectedNode.id));
  };

  const handleCut = () => {
    if (!selectedNode) {
      setFeedback({ ok: false, text: 'Em hãy bấm chọn một tệp hoặc thư mục trước khi bấm Cắt.' });
      return;
    }
    setCopyBanner(null);
    applyResult(cutNode(fsState, selectedNode.id));
  };

  const handlePaste = () => {
    const clipNode = fsState.clipboard
      ? fsState.nodes.find((n) => n.id === fsState.clipboard!.nodeId)
      : undefined;
    const isCopyPaste = fsState.clipboard?.mode === 'copy';
    const res = pasteNode(fsState, fsState.currentFolderId, { allowAutoRename: false });
    applyResult(res, {
      isCopyPaste,
      srcName: clipNode?.name,
      destName: currentFolder?.name,
    });
  };

  const handleUndo = () => {
    setCopyBanner(null);
    applyResult(undoFs(fsState));
  };

  const openCreateModal = () => {
    setInputName('');
    setModalMode('create');
  };

  const openRenameModal = () => {
    if (!selectedNode) {
      setFeedback({ ok: false, text: 'Em hãy bấm chọn tệp hoặc thư mục muốn đổi tên trước nhé.' });
      return;
    }
    setInputName(selectedNode.name);
    setModalMode('rename');
  };

  const openMoveModal = () => {
    if (!selectedNode) {
      setFeedback({ ok: false, text: 'Em hãy chọn tệp hoặc thư mục muốn di chuyển trước nhé.' });
      return;
    }
    const defaultDest = folderOptions.find((f) => f.id !== selectedNode.id && f.id !== selectedNode.parentId)?.id ?? '';
    setMoveDestId(defaultDest);
    setModalMode('move');
  };

  const openDeleteModal = () => {
    if (!selectedNode) {
      setFeedback({ ok: false, text: 'Em hãy chọn tệp hoặc thư mục cần xóa trước nhé.' });
      return;
    }
    if (selectedNode.systemImportant || selectedNode.type === 'drive') {
      applyResult(deleteNode(fsState, selectedNode.id));
      return;
    }
    setModalMode('delete');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const out = searchInCurrentFolder(fsState, searchInput);
    onChange(out.state);
    setSearchResults(out.results);
    setSearchScopeName(out.scopeFolderName);
  };

  const handleOpenSearchLocation = (nodeId: string) => {
    const res = openFileLocation(fsState, nodeId);
    setSearchResults(null);
    setSearchInput('');
    applyResult(res);
  };

  // Keyboard shortcuts when no modal/input is active
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if (modalMode) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCut();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'F2' && selectedNode) {
        e.preventDefault();
        openRenameModal();
      } else if (e.key === 'Delete' && selectedNode) {
        e.preventDefault();
        openDeleteModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Recursive left tree renderer
  const renderTree = (parentId: string | null, depth: number) => {
    const folders = fsState.nodes
      .filter((n) => n.parentId === parentId && (n.type === 'drive' || n.type === 'folder'))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

    return folders.map((f) => {
      const isCurrent = f.id === fsState.currentFolderId;
      const isTarget =
        (highlightTarget === 'tree-anh-nhom' && f.id === 'anh-nhom') ||
        (highlightTarget === 'tree-nhom2' && f.id === 'nhom-2');
      const isCutMarked = fsState.clipboard?.mode === 'cut' && fsState.clipboard.nodeId === f.id;
      return (
        <div key={f.id}>
          <button
            type="button"
            onClick={() => handleOpenFolder(f.id)}
            aria-label={`Mở ${f.name}`}
            className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              isCurrent
                ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-900 dark:text-sky-100 font-bold'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2742] font-medium'
            } ${isTarget ? 'ring-2 ring-orange-500 ring-offset-1 dark:ring-offset-[#131D31]' : ''} ${isCutMarked ? 'opacity-60 border border-dashed border-amber-500' : ''}`}
            style={{ paddingLeft: `${depth * 14 + 10}px` }}
          >
            {isCurrent ? (
              <FolderOpen className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0" />
            ) : f.type === 'drive' ? (
              <HardDrive className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-amber-500 dark:text-amber-400 fill-amber-100 dark:fill-amber-900/50 shrink-0" />
            )}
            <span className="truncate">{f.name}</span>
          </button>
          {renderTree(f.id, depth + 1)}
        </div>
      );
    });
  };

  const toolbarBtnClass = (targetId: string, danger = false) => {
    const highlighted = highlightTarget === targetId;
    return `min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
      highlighted
        ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-500 text-orange-900 dark:text-orange-100 ring-2 ring-orange-400'
        : danger
          ? 'bg-white dark:bg-[#131D31] border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50'
          : 'bg-white dark:bg-[#131D31] border-slate-200 dark:border-[#334155] text-slate-800 dark:text-slate-100 hover:bg-sky-50 dark:hover:bg-[#1A2742] hover:border-sky-300 dark:hover:border-sky-500'
    }`;
  };

  return (
    <div className="bg-white dark:bg-[#131D31] border border-slate-200 dark:border-[#25334D] rounded-2xl overflow-hidden transition-colors" data-testid="folder-simulator">
      {/* Toolbar */}
      <div className="p-3 bg-slate-50 dark:bg-[#1A2742] border-b border-slate-200 dark:border-[#25334D] flex flex-wrap items-center gap-2">
        <button type="button" onClick={openCreateModal} className={toolbarBtnClass('btn-create')}>
          <FolderPlus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          Tạo thư mục
        </button>
        <button type="button" onClick={handleCopy} className={toolbarBtnClass('btn-copy')}>
          <Copy className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          Sao chép
        </button>
        <button type="button" onClick={handleCut} className={toolbarBtnClass('btn-cut')}>
          <Scissors className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Cắt
        </button>
        <button
          type="button"
          onClick={handlePaste}
          disabled={!fsState.clipboard}
          className={`${toolbarBtnClass('btn-paste')} disabled:opacity-45 disabled:cursor-not-allowed`}
        >
          <ClipboardPaste className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Dán
        </button>
        <button type="button" onClick={openMoveModal} className={toolbarBtnClass('btn-move-to')}>
          <ArrowRightLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Di chuyển đến
        </button>
        <button type="button" onClick={openRenameModal} className={toolbarBtnClass('btn-rename')}>
          <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          Đổi tên
        </button>
        <button type="button" onClick={openDeleteModal} className={toolbarBtnClass('btn-delete', true)}>
          <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          Xóa
        </button>
        <button
          type="button"
          onClick={handleUndo}
          disabled={fsState.history.length === 0}
          className={`${toolbarBtnClass('btn-undo')} disabled:opacity-45 disabled:cursor-not-allowed`}
        >
          <Undo2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          Hoàn tác
        </button>
      </div>

      {/* Address bar + scoped search */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-[#25334D] bg-white dark:bg-[#131D31] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <nav aria-label="Đường dẫn thư mục" className="flex flex-wrap items-center gap-1 text-sm">
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={b.id}>
              {idx > 0 && <span className="text-slate-400 px-1">&gt;</span>}
              <button
                type="button"
                onClick={() => handleOpenFolder(b.id)}
                className={`px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2742] cursor-pointer ${
                  idx === breadcrumbs.length - 1 ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {b.name}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {enableSearch && (
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Tìm trong ${currentFolder?.name || 'thư mục'}...`}
              aria-label="Ô tìm kiếm tệp trong thư mục đang mở"
              className={`min-h-[42px] w-56 sm:w-64 px-3 rounded-xl border bg-white dark:bg-[#1A2742] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm ${
                highlightTarget === 'search-input'
                  ? 'border-orange-500 ring-2 ring-orange-300'
                  : 'border-slate-300 dark:border-[#334155]'
              }`}
            />
            <button
              type="submit"
              className="min-h-[42px] px-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              Tìm
            </button>
          </form>
        )}
      </div>

      {/* Clipboard status indicator */}
      {fsState.clipboard && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-100 text-xs sm:text-sm flex items-center justify-between gap-2">
          <span>
            {fsState.clipboard.mode === 'cut'
              ? `Đang chờ Cắt (Cut): "${fsState.nodes.find((n) => n.id === fsState.clipboard!.nodeId)?.name}" — tệp vẫn ở chỗ cũ cho tới khi em bấm Dán ở thư mục đích.`
              : `Đang ghi nhớ Sao chép (Copy): "${fsState.nodes.find((n) => n.id === fsState.clipboard!.nodeId)?.name}" — hãy mở thư mục đích rồi bấm Dán.`}
          </span>
        </div>
      )}

      {/* Visual Copy Split feedback banner */}
      {copyBanner && (
        <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Sao chép kép thành công:</strong> Bản gốc <em>{copyBanner.srcName}</em> vẫn ở thư mục nguồn và bản sao mới đã có trong <em>{copyBanner.destName}</em>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCopyBanner(null)}
            className="text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main split Explorer: Tree + Contents */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[340px]">
        <aside className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#25334D] p-3 bg-slate-50/70 dark:bg-[#0F172A]/60 space-y-1">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 pb-1">Cây thư mục</p>
          {renderTree(null, 0)}
        </aside>

        <section className="md:col-span-8 p-4 flex flex-col justify-between">
          {searchResults !== null ? (
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-[#25334D]">
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">
                    Kết quả tìm kiếm trong phạm vi: {searchScopeName}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Tìm thấy {searchResults.length} mục khớp từ khóa &ldquo;{fsState.searchQuery}&rdquo;
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchResults(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#334155] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2742] cursor-pointer"
                >
                  Quay lại thư mục
                </button>
              </div>
              {searchResults.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-600 dark:text-slate-300">
                  Không tìm thấy tệp nào khớp trong thư mục <strong>{searchScopeName}</strong>.
                  <br />
                  Gợi ý: Nếu tệp nằm ở thư mục khác, hãy mở thư mục cha rộng hơn (như ổ D:) rồi tìm lại!
                </div>
              ) : (
                <ul className="space-y-2">
                  {searchResults.map(({ node, path }) => (
                    <li
                      key={node.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#1A2742]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileIcon node={node} />
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{node.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 truncate">Nằm tại: {path}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenSearchLocation(node.id)}
                        className={`min-h-[40px] px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white text-xs font-bold whitespace-nowrap cursor-pointer ${
                          highlightTarget === 'btn-open-location' ? 'ring-2 ring-orange-500 ring-offset-1 dark:ring-offset-[#131D31]' : ''
                        }`}
                      >
                        Mở vị trí tệp
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div>
              {children.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Thư mục <strong>{currentFolder?.name}</strong> hiện đang trống. Em có thể bấm <strong>Tạo thư mục</strong> hoặc <strong>Dán</strong> tệp vào đây.
                </div>
              ) : (
                <div className="space-y-2" role="list" aria-label={`Danh sách mục trong ${currentFolder?.name}`}>
                  {children.map((item) => {
                    const isSelected = fsState.selectedNodeId === item.id;
                    const isCut = fsState.clipboard?.mode === 'cut' && fsState.clipboard.nodeId === item.id;
                    const isCopiedSource = fsState.clipboard?.mode === 'copy' && fsState.clipboard.nodeId === item.id;
                    return (
                      <div
                        key={item.id}
                        role="listitem"
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-colors ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500'
                            : 'bg-white dark:bg-[#1A2742] border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#223254]'
                        } ${isCut ? 'opacity-60 border-dashed border-amber-500' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => onChange(selectNode(fsState, item.id))}
                          onDoubleClick={() => {
                            if (item.type === 'folder' || item.type === 'drive') {
                              handleOpenFolder(item.id);
                            }
                          }}
                          aria-label={`${item.type === 'folder' ? 'Thư mục' : item.type === 'drive' ? 'Ổ đĩa' : 'Tệp'} ${item.name}`}
                          className="flex-1 flex items-center gap-3 text-left min-h-[40px] cursor-pointer min-w-0"
                        >
                          <FileIcon node={item} />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                              {item.name}
                              {isCut && <span className="ml-2 text-xs text-amber-700 dark:text-amber-300 font-bold">(Đang chờ Cắt)</span>}
                              {isCopiedSource && <span className="ml-2 text-xs text-sky-700 dark:text-sky-300 font-bold">(Đã Sao chép)</span>}
                              {item.systemImportant && (
                                <span className="ml-2 text-xs text-rose-700 dark:text-rose-400 font-semibold">(Hệ thống)</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.type === 'folder' ? 'Thư mục' : item.type === 'drive' ? 'Ổ đĩa' : `Tệp ${item.sizeLabel ?? ''}`}
                            </p>
                          </div>
                        </button>
                        {(item.type === 'folder' || item.type === 'drive') && (
                          <button
                            type="button"
                            onClick={() => handleOpenFolder(item.id)}
                            aria-label={`Mở ${item.name}`}
                            className="min-h-[38px] px-3 rounded-lg bg-slate-100 dark:bg-[#131D31] hover:bg-sky-100 dark:hover:bg-sky-900/60 text-slate-800 dark:text-slate-100 border border-transparent dark:border-[#334155] text-xs font-bold whitespace-nowrap cursor-pointer"
                          >
                            Mở
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Operation feedback strip */}
          {feedback && (
            <div
              role="status"
              className={`mt-4 p-3 rounded-xl border text-sm font-medium flex items-start gap-2.5 ${
                feedback.ok
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
              }`}
            >
              {feedback.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
        </section>
      </div>

      {/* Accessible inline modals (create / rename / move / delete) */}
      {modalMode && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#131D31] rounded-2xl border border-slate-200 dark:border-[#25334D] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100">
                {modalMode === 'create' && 'Tạo thư mục mới'}
                {modalMode === 'rename' && `Đổi tên "${selectedNode?.name}"`}
                {modalMode === 'move' && `Di chuyển "${selectedNode?.name}" đến...`}
                {modalMode === 'delete' && `Xác nhận xóa "${selectedNode?.name}"`}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                aria-label="Đóng hộp thoại"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2742] text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(modalMode === 'create' || modalMode === 'rename') && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (modalMode === 'create') {
                    const res = createFolder(fsState, inputName);
                    applyResult(res);
                    if (res.ok) setModalMode(null);
                  } else if (selectedNode) {
                    const res = renameNode(fsState, selectedNode.id, inputName);
                    applyResult(res);
                    if (res.ok) setModalMode(null);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="fs-name-input" className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    {modalMode === 'create' ? 'Nhập tên thư mục mới:' : 'Nhập tên mới:'}
                  </label>
                  <input
                    id="fs-name-input"
                    type="text"
                    autoFocus
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="Ví dụ: Bai tap"
                    className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 dark:border-[#334155] bg-white dark:bg-[#1A2742] text-slate-900 dark:text-slate-100 text-base"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2742] cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white text-sm font-bold cursor-pointer"
                  >
                    Lưu
                  </button>
                </div>
              </form>
            )}

            {modalMode === 'move' && selectedNode && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="fs-move-dest" className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Chọn thư mục đích:
                  </label>
                  <select
                    id="fs-move-dest"
                    value={moveDestId}
                    onChange={(e) => setMoveDestId(e.target.value)}
                    className="w-full min-h-[46px] px-3 rounded-xl border border-slate-300 dark:border-[#334155] text-sm bg-white dark:bg-[#1A2742] text-slate-900 dark:text-slate-100"
                  >
                    {folderOptions
                      .filter((f) => f.id !== selectedNode.id)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2742] cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const res = moveToNode(fsState, selectedNode.id, moveDestId);
                      applyResult(res);
                      if (res.ok) setModalMode(null);
                    }}
                    className="min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white text-sm font-bold cursor-pointer"
                  >
                    Di chuyển tới đây
                  </button>
                </div>
              </div>
            )}

            {modalMode === 'delete' && selectedNode && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-100 text-sm flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Em có chắc muốn xóa <strong>{selectedNode.name}</strong> không? Hãy kiểm tra kĩ tên để không xóa nhầm tệp quan trọng nhé.
                  </span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-[#334155] text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2742] cursor-pointer"
                  >
                    Giữ lại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const res = deleteNode(fsState, selectedNode.id);
                      applyResult(res);
                      setModalMode(null);
                    }}
                    className="min-h-[44px] px-5 rounded-xl bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white text-sm font-bold cursor-pointer"
                  >
                    Xác nhận xóa
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
