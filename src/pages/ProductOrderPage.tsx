import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Package } from 'lucide-react';
import ProjectList from '../components/projects/ProjectList';
import ProjectForm from '../components/projects/ProjectForm';
import ProjectDetail from '../components/projects/ProjectDetail';
import { useStore } from '../store/useStore';
import { Project } from '../types';

export default function ProductOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, addProject, updateProject, deleteProject } = useStore();
  const isEditMode = location.pathname.endsWith('/edit');

  if (id === 'new') {
    const handleSave = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      addProject(data);
      navigate('/product-order');
    };

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">새 제품 발주 프로젝트</h1>
        <ProjectForm type="product_order" onSave={handleSave} />
      </div>
    );
  }

  if (id && isEditMode) {
    const project = projects.find((p) => p.id === id);

    if (!project) {
      return <div className="text-center py-12"><p className="text-gray-500">프로젝트를 찾을 수 없습니다.</p></div>;
    }

    const handleSave = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      updateProject(id, data);
      navigate(`/product-order/${id}`);
    };

    const handleDelete = () => {
      deleteProject(id);
      navigate('/product-order');
    };

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">제품 발주 프로젝트 수정</h1>
        <ProjectForm type="product_order" project={project} onSave={handleSave} onDelete={handleDelete} />
      </div>
    );
  }

  if (id) {
    const project = projects.find((p) => p.id === id);
    if (!project) {
      return <div className="text-center py-12"><p className="text-gray-500">프로젝트를 찾을 수 없습니다.</p></div>;
    }
    return <ProjectDetail project={project} />;
  }

  return (
    <ProjectList
      type="product_order"
      title="제품 발주"
      icon={
        <div className="w-12 h-12 rounded-2xl bg-cyan-100 flex items-center justify-center">
          <Package className="w-6 h-6 text-cyan-600" />
        </div>
      }
    />
  );
}
