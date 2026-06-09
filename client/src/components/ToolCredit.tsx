type CreditLink = {
  label: string;
  href: string;
};

type ToolCreditProps = {
  links: readonly CreditLink[];
};

export function ToolCredit({ links }: ToolCreditProps) {
  return (
    <footer className="tool-credit" aria-label="크레딧">
      <span>Credit:</span>
      {links.map((link, index) => (
        <span className="tool-credit-item" key={link.href}>
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          <a href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        </span>
      ))}
    </footer>
  );
}
