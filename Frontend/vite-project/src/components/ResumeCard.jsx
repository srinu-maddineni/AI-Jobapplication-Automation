const ResumeCard = ({ resume }) => {
  return (
    <div className="card card-resume">
      <div className="card-header card-header-spaced">
        <div>
          <h3 className="card-title">{resume.originalFileName}</h3>
          <p className="card-subtitle">Uploaded: {new Date(resume.createdAt).toLocaleDateString()}</p>
        </div>
        <span className="badge badge-pill">Parsed</span>
      </div>
      <div className="card-description card-text-block">
        {resume.extractedText ? resume.extractedText.slice(0, 350) + '...' : 'No text parsed from this resume yet.'}
      </div>
      {resume.extractedSkills?.length > 0 && (
        <div className="skills-list">
          <div className="skills-title">Detected skills</div>
          <div className="skills-wrap">
            {resume.extractedSkills.map((skill) => (
              <span key={skill} className="skill-chip">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeCard;
