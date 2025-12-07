import { NavLink, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { useStore } from '../../store/useStore';

const menuItems = [
  { icon: LayoutDashboard, label: '대시보드', path: '/' },
  { icon: Beaker, label: '샘플링', path: '/sampling' },
  { icon: FileImage, label: '상세페이지 제작', path: '/detail-page' },
  { icon: Users, label: '인플루언서 협업', path: '/influencer' },
  { icon: Package, label: '제품 발주', path: '/product-order' },
  { icon: ShoppingCart, label: '공동구매', path: '/group-purchase' },
  { icon: FolderOpen, label: '기타 프로젝트', path: '/other' },
  { icon: DollarSign, label: '매출 관리', path: '/sales' },
  { icon: BarChart3, label: '통계', path: '/statistics' },
  { icon: Settings, label: '설정', path: '/settings' },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useStore();
  const location = useLocation();

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
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600' : ''}`} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            );
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
