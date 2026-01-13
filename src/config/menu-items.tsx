import {
  RadioIcon,
  CircleDotIcon,
  FileTextIcon,
  SparklesIcon,
  LightbulbIcon,
} from "@/components/icons"

export interface SubMenuItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  isActive?: boolean
}

export interface MenuItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  action?: React.ComponentType<{ className?: string }>
  isActive?: boolean
  children?: SubMenuItem[]
}

export const menuItems: MenuItem[] = [
  {
    title: "Playlists",
    url: "#",
    icon: RadioIcon,
    children: [
      {
        title: "Live",
        url: "#",
        icon: CircleDotIcon,
      },
      {
        title: "Drafts",
        url: "#",
        icon: FileTextIcon,
      },
    ],
  },
  {
    title: "Curation",
    url: "#",
    icon: SparklesIcon,
    children: [
      {
        title: "Suggested Clips",
        url: "#",
        icon: LightbulbIcon,
        isActive: true,
      },
      {
        title: "Produced Clips",
        url: "#",
        icon: RadioIcon,
      },
    ],
  },
]

