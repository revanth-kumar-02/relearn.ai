import React from 'react';
import { useSEO, UseSEOProps } from '../../hooks/useSEO';

export interface SEOProps extends UseSEOProps {
  children?: React.ReactNode;
}

export const SEO: React.FC<SEOProps> = ({ children, ...props }) => {
  useSEO(props);
  return children ? <>{children}</> : null;
};

export default SEO;
