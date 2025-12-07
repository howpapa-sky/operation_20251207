import { useParams, useNavigate } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import ProjectList from '../components/projects/ProjectList';
import ProjectForm from '../components/projects/ProjectForm';
import ProjectDetail from '../components/projects/ProjectDetail';
import { useStore } from '../store/useStore';
import { Project } from '../types';

export default function OtherPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, addProject, updateProject, deleteProject } = useStore();

  if (id === 'new') {
    const handleSave = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      addProject(data);
      navigate('/other');
    };

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">새 기타 프로젝트</h1>
        <ProjectForm type="other" onSave={handleSave} />
      </div>
    );
  }

  if (id?.endsWith('/edit')) {
    const projectId = id.replace('/edit', '');
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
      return <div className="text-center py-12"><p className="text-gray-500">프로젝트를 찾을 수 없습니다.</p></div>;
    }

    const handleSave = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      updateProject(projectId, data);
      navigate(`/other/${projectId}`);
    };

    const handleDelete = () => {
      deleteProject(projectId);
      navigate('/other');
    };

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">기타 프로젝트 수정</h1>
        <ProjectForm type="other" project={project} onSave={handleSave} onDelete={handleDelete} />
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
      type="other"
      title="기타 프로젝트"
      icon={
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
          <FolderOpen className="w-6 h-6 text-gray-600" />
        </div>
      }
    />
  );
}
