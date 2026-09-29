import { useState, useEffect, useCallback } from 'react';

export interface WalkthroughStep {
  id: string;
  target: string; // data-walkthrough attribute value
  title: string;
  description: string;
  position?: 'bottom' | 'right' | 'left' | 'top';
}

const adminSteps: WalkthroughStep[] = [
  {
    id: 'sidebar',
    target: 'sidebar-nav',
    title: 'Navigation Sidebar',
    description: 'Browse staff management, attendance, tasks, leave, and more. Click any item to navigate.',
    position: 'right',
  },
  {
    id: 'staff',
    target: 'nav-staff',
    title: 'Staff Management',
    description: 'Add, edit, and manage staff members. Supports Excel bulk import and role assignment.',
    position: 'right',
  },
  {
    id: 'tasks',
    target: 'nav-tasks',
    title: 'Task Management',
    description: 'Assign tasks with priority and due dates. Staff marks complete → you verify. Activity timeline tracks all changes.',
    position: 'right',
  },
  {
    id: 'chat',
    target: 'nav-chat',
    title: 'Team Chat',
    description: 'Real-time messaging with your team. Edit/delete messages, search history, and moderate conversations.',
    position: 'right',
  },
  {
    id: 'settings',
    target: 'nav-settings',
    title: 'Settings',
    description: 'Configure user access, menu visibility, notifications, and system preferences.',
    position: 'right',
  },
];

const managerSteps: WalkthroughStep[] = [
  {
    id: 'sidebar',
    target: 'sidebar-nav',
    title: 'Navigation Sidebar',
    description: 'Access tasks, attendance, leave, staff reports, and more.',
    position: 'right',
  },
  {
    id: 'tasks',
    target: 'nav-tasks',
    title: 'Task Management',
    description: 'Create and assign tasks to staff. Verify completed tasks and track activity timelines.',
    position: 'right',
  },
  {
    id: 'chat',
    target: 'nav-chat',
    title: 'Team Chat',
    description: 'Communicate with your team in real-time. Moderate messages and search history.',
    position: 'right',
  },
];

const staffSteps: WalkthroughStep[] = [
  {
    id: 'dashboard',
    target: 'nav-staff-dashboard',
    title: 'Your Dashboard',
    description: 'Quick overview of your tasks, attendance, and recent activity.',
    position: 'right',
  },
  {
    id: 'tasks',
    target: 'nav-tasks',
    title: 'Your Tasks',
    description: 'View tasks assigned to you. Update status and mark as complete for verification.',
    position: 'right',
  },
  {
    id: 'leave',
    target: 'nav-leave-permission',
    title: 'Leave & Permission',
    description: 'Apply for leave or permission. Track approval status and history.',
    position: 'right',
  },
  {
    id: 'chat',
    target: 'nav-chat',
    title: 'Team Chat',
    description: 'Message your team in real-time. Use Shift+Enter for new lines.',
    position: 'right',
  },
  {
    id: 'attendance',
    target: 'nav-attendance',
    title: 'Attendance',
    description: 'View your attendance records and punch-in history.',
    position: 'right',
  },
];

function getStepsForRole(role?: string, designation?: string, userType?: string): WalkthroughStep[] {
  if (designation === 'super_admin' || designation === 'admin' || role === 'admin') return adminSteps;
  if (designation === 'manager' || role === 'manager') return managerSteps;
  return staffSteps;
}

interface UseWalkthroughOptions {
  userId?: string;
  userRole?: string;
  userDesignation?: string;
  userType?: string;
}

export function useWalkthrough({ userId, userRole, userDesignation, userType }: UseWalkthroughOptions) {
  const storageKey = userId ? `walkthrough_completed_${userId}` : null;
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = getStepsForRole(userRole, userDesignation, userType);

  useEffect(() => {
    if (!storageKey) return;
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Delay start to let UI render
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const currentStep = steps[currentStepIndex] || null;

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Complete
      if (storageKey) localStorage.setItem(storageKey, 'true');
      setIsActive(false);
    }
  }, [currentStepIndex, steps.length, storageKey]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const skipWalkthrough = useCallback(() => {
    if (storageKey) localStorage.setItem(storageKey, 'true');
    setIsActive(false);
  }, [storageKey]);

  const restartWalkthrough = useCallback(() => {
    if (storageKey) localStorage.removeItem(storageKey);
    setCurrentStepIndex(0);
    setIsActive(true);
  }, [storageKey]);

  return {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps: steps.length,
    nextStep,
    previousStep,
    skipWalkthrough,
    restartWalkthrough,
  };
}
