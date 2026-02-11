import {
  RadioIcon,
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
  },
  {
    title: "Clips",
    url: "#",
    icon: RadioIcon,
  },
  {
    title: "Curation",
    url: "#",
    icon: SparklesIcon,
    children: [
      {
        title: "Suggested Clips",
        url: "/dashboard/suggested-clips",
        icon: LightbulbIcon,
        isActive: true,
      },
      {
        title: "Curation Group",
        url: "/dashboard/curation-group",
        icon: LightbulbIcon,
      },
      {
        title: "Episode Feed SXM",
        url: "/dashboard/feed-sxm",
        icon: RadioIcon,
      },
      {
        title: "On Demand Episodes",
        url: "/dashboard/on-demand-episodes",
        icon: RadioIcon,
      },
      {
        title: "Tracked Podcasts",
        url: "/dashboard/tracked-podcasts",
        icon: RadioIcon,
      },
    ],
  },
  {
    title: "Programming",
    url: "#",
    icon: RadioIcon,
    children: [
      {
        title: "Daily Clips",
        url: "/dashboard/daily-clips",
        icon: RadioIcon,
      },
    ],
  },
  {
    title: "Taxonomy",
    url: "#",
    icon: LightbulbIcon,
    children: [
      {
        title: "Topic",
        url: "/dashboard/topic",
        icon: LightbulbIcon,
      },
      {
        title: "Genre",
        url: "/dashboard/genre",
        icon: LightbulbIcon,
      },
      {
        title: "Tones",
        url: "/dashboard/tone",
        icon: LightbulbIcon,
      },
    ],
  },
]

