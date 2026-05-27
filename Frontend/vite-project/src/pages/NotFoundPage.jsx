import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist.</p>
        <Link to="/dashboard" className="button button-secondary">
          Go back to dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
