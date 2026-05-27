const SkeletonBlock = ({ rows = 3 }) => (
  <div className="skeleton-stack">
    {Array.from({ length: rows }).map((_, index) => (
      <div className="skeleton-line" key={index} />
    ))}
  </div>
);

export default SkeletonBlock;
