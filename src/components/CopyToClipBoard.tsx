import { MdCopyAll } from "react-icons/md";

export function CopyToClipboard({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <MdCopyAll
      className={
        "inline invisible group-hover:visible hover:cursor-pointer " + className
      }
      onClick={() => navigator.clipboard.writeText(text)}
    />
  );
}
