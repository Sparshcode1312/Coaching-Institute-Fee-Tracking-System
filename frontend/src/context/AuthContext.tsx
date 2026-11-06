import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, setAuthToken, clearAuthToken, getAuthToken } from '../services/apiClient.js';

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: 'parent' | 'accounts_executive' | 'super_admin';
}

export interface LinkedStudent {
  studentId: string;
  rollNumber: string;
  fullName: string;
  batchName: string;
  centreName: string;
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  linkedStudents: LinkedStudent[];
  activeStudent: LinkedStudent | null;
  setActiveStudent: (student: LinkedStudent) => void;
  isLoading: boolean;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  loginStaff: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(() => {
    const cached = localStorage.getItem('auth_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>(() => {
    const cached = localStorage.getItem('linked_students');
    return cached ? JSON.parse(cached) : [];
  });
  const [activeStudent, setActiveStudentState] = useState<LinkedStudent | null>(() => {
    const cached = localStorage.getItem('active_student');
    return cached ? JSON.parse(cached) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const currentToken = getAuthToken();
      if (currentToken) {
        try {
          const profile = await apiClient.get<AuthenticatedUser>('/auth/me');
          setUser(profile);
          localStorage.setItem('auth_user', JSON.stringify(profile));
        } catch {
          // Token expired or invalid
          clearAuthToken();
          setUser(null);
          setTokenState(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const setActiveStudent = (student: LinkedStudent) => {
    setActiveStudentState(student);
    localStorage.setItem('active_student', JSON.stringify(student));
  };

  const loginWithOtp = async (phone: string, otp: string) => {
    const result = await apiClient.post<{
      token: string;
      user: AuthenticatedUser;
      linkedStudents?: LinkedStudent[];
    }>('/auth/parent/verify-otp', { phone, otp });

    setAuthToken(result.token);
    setTokenState(result.token);
    setUser(result.user);
    localStorage.setItem('auth_user', JSON.stringify(result.user));

    const students = result.linkedStudents || [];
    setLinkedStudents(students);
    localStorage.setItem('linked_students', JSON.stringify(students));

    if (students.length > 0 && !activeStudent) {
      setActiveStudent(students[0]);
    }
  };

  const loginStaff = async (email: string, password: string) => {
    const result = await apiClient.post<{
      token: string;
      user: AuthenticatedUser;
    }>('/auth/staff/login', { email, password });

    setAuthToken(result.token);
    setTokenState(result.token);
    setUser(result.user);
    localStorage.setItem('auth_user', JSON.stringify(result.user));
  };

  const logout = () => {
    clearAuthToken();
    localStorage.removeItem('linked_students');
    localStorage.removeItem('active_student');
    setUser(null);
    setTokenState(null);
    setLinkedStudents([]);
    setActiveStudentState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        linkedStudents,
        activeStudent,
        setActiveStudent,
        isLoading,
        loginWithOtp,
        loginStaff,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
