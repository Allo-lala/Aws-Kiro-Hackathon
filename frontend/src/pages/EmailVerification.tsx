import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export const EmailVerification: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('Invalid verification link');
        return;
      }

      try {
        await verifyEmail(token);
        setStatus('success');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Verification failed');
      }
    };

    verify();
  }, [token, verifyEmail, navigate]);

  if (status === 'verifying') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="verification-status">
            <div className="loading-spinner"></div>
            <h2>Verifying Your Email</h2>
            <p>Please wait while we verify your email address...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>Email Verified Successfully!</h2>
            <p>
              Your account has been activated. You can now sign in and start using Rutty.
            </p>
            <p className="redirect-message">
              Redirecting to login page in 3 seconds...
            </p>
            <Link to="/login" className="btn btn-primary">
              Go to Login Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="error-message-page">
          <div className="error-icon">✗</div>
          <h2>Verification Failed</h2>
          <p>{errorMessage}</p>
          <p>
            The verification link may be invalid or expired. Please try registering again
            or contact support if the problem persists.
          </p>
          <div className="error-actions">
            <Link to="/register" className="btn btn-primary">
              Register Again
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
