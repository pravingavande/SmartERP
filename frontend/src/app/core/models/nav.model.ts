export interface NavItem {
  label: string;
  icon: string;
  route: string;
  /** Highlighted “cool” menu style (e.g. School Dashboard). */
  highlight?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}
