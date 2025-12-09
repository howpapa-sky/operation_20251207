import { useParams, useNavigate, useLocation } from 'react-router-dom';
import SamplingList from '../components/projects/SamplingList';
import ProjectForm from '../components/projects/ProjectForm';
import ProjectDetail from '../components/projects/ProjectDetail';
import { useStore } from '../store/useStore';
import { Project } from '../types';

export default function SamplingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, addProject, updateProject, deleteProject } = useStore();
  const isEditMode = location.pathname.endsWith('/edit');

  // New project
  if (id === 'new') {
    const handleSave = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      addProject(data);
      navigate('/sampling');
    };

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">새 샘플링 프로젝트</h1>
        <ProjectForm type="sampling" onSave={handleSave} />
      </div>
    );
  }

  // Edit project
  if (id && isEditMode) {
    const project = projects.find((p) => p.id === id);

    if (!project) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">프로젝트를 찾을 수 없습니다.</p>
        </div>
      );
    }

    const handleSave = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      updateProject(id, data);
      navigate(`/sampling/${id}`);
    };

    const handleDelete = () => {
      deleteProject(id);
      navigate('/sampling');
    };

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">샘플링 프로젝트 수정</h1>
        <ProjectForm
          type="sampling"
          project={project}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </div>
    );
  }

  // View project detail
  if (id) {
    const project = projects.find((p) => p.id === id);

    if (!project) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">프로젝트를 찾을 수 없습니다.</p>
        </div>
      );
    }

    return <ProjectDetail project={project} />;
  }

  // List view with dedicated Sampling component
  return <SamplingList />;
}
