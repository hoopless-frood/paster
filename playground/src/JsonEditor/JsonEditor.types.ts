export interface JsonEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  spellCheck?: boolean;
}
