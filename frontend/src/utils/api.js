export const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '');

export const resolveAssetUrl = (assetPath) => {
  if (!assetPath) {
    return '';
  }

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  return `${apiOrigin}${assetPath.startsWith('/') ? assetPath : `/${assetPath}`}`;
};
