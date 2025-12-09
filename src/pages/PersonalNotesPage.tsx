import { useEffect, useState } from 'react';
import { Plus, Pin, Trash2, Edit2, X, Check, StickyNote } from 'lucide-react';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import { usePersonalTaskStore, PersonalNote } from '../store/usePersonalTaskStore';

const noteColors = [
  { value: '#ffffff', label: '흰색' },
  { value: '#fef3c7', label: '노랑' },
  { value: '#dcfce7', label: '초록' },
  { value: '#dbeafe', label: '파랑' },
  { value: '#fce7f3', label: '핑크' },
  { value: '#f3e8ff', label: '보라' },
];

export default function PersonalNotesPage() {
  const {
    notes,
    notesLoading,
    fetchNotes,
    addNote,
    updateNote,
    deleteNote,
  } = usePersonalTaskStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isPinned: false,
    color: '#ffffff',
  });

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleOpenModal = (note?: PersonalNote) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        title: note.title,
        content: note.content,
        isPinned: note.isPinned,
        color: note.color,
      });
    } else {
      setEditingNote(null);
      setFormData({
        title: '',
        content: '',
        isPinned: false,
        color: '#ffffff',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingNote(null);
    setFormData({
      title: '',
      content: '',
      isPinned: false,
      color: '#ffffff',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingNote) {
      await updateNote(editingNote.id, formData);
    } else {
      await addNote(formData);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      await deleteNote(id);
    }
  };

  const handleTogglePin = async (note: PersonalNote) => {
    await updateNote(note.id, { isPinned: !note.isPinned });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
            <StickyNote className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">비공개 메모</h1>
            <p className="text-gray-500">나만 볼 수 있는 개인 메모입니다</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          새 메모
        </button>
      </div>

      {/* Notes Grid */}
      {notesLoading ? (
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      ) : notes.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <StickyNote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">메모가 없습니다</h3>
            <p className="text-gray-500 mb-4">새 메모를 작성해보세요</p>
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              새 메모 작성
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl shadow-elegant border border-gray-100/50 p-4 relative group"
              style={{ backgroundColor: note.color }}
            >
              {/* Pin indicator */}
              {note.isPinned && (
                <div className="absolute top-2 left-2">
                  <Pin className="w-4 h-4 text-gray-500 fill-gray-500" />
                </div>
              )}

              {/* Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <button
                  onClick={() => handleTogglePin(note)}
                  className={`p-1.5 rounded-lg hover:bg-gray-200 ${
                    note.isPinned ? 'text-amber-600' : 'text-gray-400'
                  }`}
                  title={note.isPinned ? '고정 해제' : '고정'}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenModal(note)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                  title="수정"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="pt-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                  {note.title}
                </h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-6">
                  {note.content}
                </p>
              </div>

              {/* Timestamp */}
              <div className="mt-4 pt-3 border-t border-gray-200/50 text-xs text-gray-500">
                {new Date(note.updatedAt).toLocaleDateString('ko-KR')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingNote ? '메모 수정' : '새 메모'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
              placeholder="메모 제목"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input-field min-h-[200px]"
              placeholder="메모 내용을 입력하세요..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">색상</label>
            <div className="flex gap-2">
              {noteColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color.value
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPinned"
              checked={formData.isPinned}
              onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isPinned" className="text-sm text-gray-700">
              상단에 고정
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">
              취소
            </button>
            <button type="submit" className="btn-primary">
              {editingNote ? '수정' : '저장'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
