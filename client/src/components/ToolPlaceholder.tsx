interface ToolPlaceholderProps {
  title: string;
  description: string;
}

export function ToolPlaceholder({ title, description }: ToolPlaceholderProps) {
  return (
    <section className="tool-placeholder" aria-labelledby="tool-placeholder-title">
      <div className="placeholder-status">준비 중</div>
      <h2 id="tool-placeholder-title">{title}</h2>
      <p>{description}</p>
    </section>
  );
}
