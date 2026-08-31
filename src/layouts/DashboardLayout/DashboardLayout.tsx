import React, { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const DashboardLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#faf7f5]">
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<LoadingSpinner size="lg" text="Loading module..." />}>
            <Outlet />
          </Suspense>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default DashboardLayout;
