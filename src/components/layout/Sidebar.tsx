import { NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Beaker,
  FileImage,
  Users,
  Package,
  ShoppingCart,
  FolderOpen,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  DollarSign,
  LucideIcon,
  StickyNote,
  CheckSquare,
  MessageSquare,
  User,
  Box,
  Gift,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useProjectSettingsStore } from '../../store/useProjectSettingsStore';
import { ProjectType } from '../../types';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  projectType?: ProjectType;
}

const allMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: '대시보드', path: '/' },
  { icon: Beaker, label: '샘플링', path: '/sampling', projectType: 'sampling' },
  { icon: FileImage, label: '상세페이지 제작', path: '/detail-page', projectType: 'detail_page' },
  { icon: Users, label: '인플루언서 협업', path: '/influencer', projectType: 'influencer' },
  { icon: Package, label: '제품 발주', path: '/product-order', projectType: 'product_order' },
  { icon: ShoppingCart, label: '공동구매', path: '/group-purchase', projectType: 'group_purchase' },
  { icon: FolderOpen, label: '기타 프로젝트', path: '/other', projectType: 'other' },
  { icon: Box, label: '제품 마스터', path: '/product-master' },
  { icon: Gift, label: '프로모션 관리', path: '/promotion' },
  { icon: DollarSign, label: '매출 관리', path: '/sales' },
  { icon: BarChart3, label: '통계', path: '/statistics' },
  { icon: Settings, label: '설정', path: '/settings' },
];

const personalMenuItems: MenuItem[] = [
  { icon: StickyNote, label: '비공개 메모', path: '/personal/notes' },
  { icon: CheckSquare, label: '내 작업 현황', path: '/personal/my-tasks' },
  { icon: MessageSquare, label: '상태 업데이트', path: '/personal/status-updates' },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useStore();
  const location = useLocation();
  const { projectTypeSettings, fetchProjectTypeSettings, isProjectTypeVisible } = useProjectSettingsStore();

  useEffect(() => {
    if (projectTypeSettings.length === 0) {
      fetchProjectTypeSettings();
    }
  }, [projectTypeSettings.length, fetchProjectTypeSettings]);

  // 프로젝트 유형 설정에 따라 메뉴 필터링
  const menuItems = allMenuItems.filter((item) => {
    if (!item.projectType) return true; // 프로젝트 유형이 아닌 메뉴는 항상 표시
    return isProjectTypeVisible(item.projectType);
  });

  // 커스텀 이름 적용
  const getMenuLabel = (item: MenuItem): string => {
    if (item.projectType) {
      const setting = projectTypeSettings.find((s) => s.projectType === item.projectType);
      if (setting?.customName) return setting.customName;
    }
    return item.label;
  };

  const renderMenuItem = (item: MenuItem, isActive: boolean) => (
    <li key={item.path}>
      <NavLink
        to={item.path}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-primary-50 text-primary-700 font-medium'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
        title={sidebarCollapsed ? getMenuLabel(item) : undefined}
      >
        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600' : ''}`} />
        {!sidebarCollapsed && <span>{getMenuLabel(item)}</span>}
      </NavLink>
    </li>
  );

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40 flex flex-col ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-howpapa-500 to-howpapa-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">HOWPAPA</h1>
              <p className="text-xs text-gray-500">Project Manager</p>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-howpapa-500 to-howpapa-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Main Menu */}
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return renderMenuItem(item, isActive);
          })}
        </ul>

        {/* Personal Section Divider */}
        <div className="my-4 border-t border-gray-200" />

        {/* Personal Section Header */}
        {!sidebarCollapsed && (
          <div className="px-3 mb-2 flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <User className="w-4 h-4" />
            개인 업무
          </div>
        )}
        {sidebarCollapsed && (
          <div className="flex justify-center mb-2">
            <User className="w-4 h-4 text-gray-400" />
          </div>
        )}

        {/* Personal Menu Items */}
        <ul className="space-y-1">
          {personalMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return renderMenuItem(item, isActive);
          })}
        </ul>
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">접기</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
