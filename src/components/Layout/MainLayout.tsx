import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { PageName } from '@/types';

interface MainLayoutProps {
  currentPage: PageName;
  onNavigate: (page: PageName) => void;
  children: React.ReactNode;
}

export function MainLayout({
  currentPage,
  onNavigate,
  children,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">

      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
      />

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <Header currentPage={currentPage} />

        {/* Page Content */}
        <main
          className="
            flex-1
            overflow-y-auto
            bg-background
            text-foreground
          "
        >
          {children}
        </main>

      </div>
    </div>
  );
}