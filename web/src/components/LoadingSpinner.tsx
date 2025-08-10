interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export function LoadingSpinner({ size = 'medium', text }: LoadingSpinnerProps) {
  const sizeMap = {
    small: '16px',
    medium: '24px', 
    large: '48px'
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '12px',
        padding: '20px'
      }}>
        <div 
          style={{
            width: sizeMap[size],
            height: sizeMap[size],
            border: '2px solid #374151',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        {text && (
          <span style={{ 
            fontSize: '14px', 
            color: '#9ca3af',
            textAlign: 'center' 
          }}>
            {text}
          </span>
        )}
      </div>
    </>
  );
}
