'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Jobs', icon: '💼' },
  { href: '/dashboard/applicants', label: 'Applicants', icon: '👤' },
  { href: '/dashboard/resume', label: 'Resume', icon: '📄' },
  { href: '/dashboard/portfolio', label: 'Portfolio', icon: '🗂' },
  { href: '/dashboard/skills', label: 'Skills', icon: '⚡' },
  { href: '/dashboard/training', label: 'Training', icon: '📚' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙' },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    document.cookie = 'token=; path=/; max-age=0';
    router.push('/login');
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">Job Helper</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'active' : ''}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="main-content">
        <header className="main-header">
          <h1>
            {navItems.find(
              (item) =>
                item.href === pathname ||
                (pathname.startsWith(item.href) && item.href !== '/dashboard')
            )?.label || 'Jobs'}
          </h1>
          <button className="btn-secondary btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </header>
        <div className="main-body">{children}</div>
      </div>
    </div>
  );
}
