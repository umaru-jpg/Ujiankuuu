import Icon from "@/components/Icon";

interface ComingSoonProps {
  title: string;
  description: string;
  roleLabel: string;
}

export default function ComingSoon({ title, description, roleLabel }: ComingSoonProps) {
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-outline-variant/30 p-10 md:p-16 text-center flex flex-col items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center">
        <Icon name="construction" size={36} className="text-secondary" />
      </div>
      <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-lg">{description}</p>
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
        <Icon name="badge" size={14} />
        Role: {roleLabel}
      </span>
    </div>
  );
}
