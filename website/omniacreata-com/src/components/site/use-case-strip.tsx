type UseCaseStripProps = {
  items: string[];
};

export function UseCaseStrip({ items }: UseCaseStripProps) {
  const track = [...items, ...items];

  return (
    <div className="use-case-strip" aria-hidden="true">
      <div className="use-case-strip__track">
        {track.map((item, index) => (
          <span className="use-case-strip__token" key={`${item}-${index}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
