export interface Tab<T extends string = string> {
  id: T;
  label: string;
  hasError?: boolean;
}

export interface TabsProps<T extends string = string> {
  tabs: Tab<T>[];
  activeTab: T;
  onTabChange: (id: T) => void;
  label: string;
}
