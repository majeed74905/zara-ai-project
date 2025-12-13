
import React from 'react';

// Authentication disabled. Pass-through component.
export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
