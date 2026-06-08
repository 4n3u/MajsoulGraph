import { useId } from "react";

interface ToolPlaceholderProps {
  title: string;
  description: string;
}

export function ToolPlaceholder({ title, description }: ToolPlaceholderProps) {
  const titleId = useId();

  return (
    <section className="tool-placeholder" aria-labelledby={titleId}>
      <div className="placeholder-status">준비 중</div>
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
