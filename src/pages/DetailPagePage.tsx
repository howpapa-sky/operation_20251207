import { useParams, useNavigate } from 'react-router-dom';
import { FileImage } from 'lucide-react';
import ProjectList from '../components/projects/ProjectList';
import ProjectForm from '../components/projects/ProjectForm';
import ProjectDetail from '../components/projects/ProjectDetail';
import { useStore } from '../store/useStore';
import { Project } from '../types';

export default function DetailPagePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, addProject, updateProject, deleteProject } = useStore();

  if (id === 'new') {
    const handleSave = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      addProject(data);
      navigate('/detail-page');
    };

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">새 상세페이지 제작 프로젝트</h1>
        <ProjectForm type="detail_page" onSave={handleSave} />
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
      navigate(`/detail-page/${projectId}`);
    };

    const handleDelete = () => {
      deleteProject(projectId);
      navigate('/detail-page');
    };

    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">상세페이지 제작 프로젝트 수정</h1>
        <ProjectForm type="detail_page" project={project} onSave={handleSave} onDelete={handleDelete} />
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
      type="detail_page"
      title="상세페이지 제작"
      icon={
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
          <FileImage className="w-6 h-6 text-indigo-600" />
        </div>
      }
    />
  );
}
