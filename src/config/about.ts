/**
 * Configuration for the About & Team page and Event Highlights.
 * Edit this file to add team members, update event details, or list highlight pictures.
 */

export interface TeamMember {
  name: string;
  role: string;
  affiliation: string;
  photo?: string;
  linkedin?: string;
  email?: string;
}

export interface EventConfig {
  name: string;
  date: string;
  challenge: string;
}

export interface HighlightItem {
  src: string;
  caption: string;
}

/**
 * Team members (up to 4 displayed).
 * If photo is empty, initials are rendered on a navy background.
 * Optional linkedin and email icons will only show if provided.
 */
export const TEAM: TeamMember[] = [
  {
    name: 'Hafiz Muhammad Faisal',
    role: 'Power Engineering',
    affiliation: 'Technical University of Munich (TUM)',
    photo: '',
    linkedin: '',
    email: '',
  },
  {
    name: 'Karthik Alapati',
    role: 'AI for Business',
    affiliation: '',
    photo: '',
    linkedin: '',
    email: '',
  },
];

/**
 * Hackathon event metadata
 */
export const EVENT: EventConfig = {
  name: 'WATT THE HACK - Munich Energy & AI Hackathon',
  date: '24 October 2026',
  challenge: 'BayWa r.e. - Wind Farm Energy Loss Prediction',
};

/**
 * Event highlights gallery pictures (files located in public/highlights/).
 * To add pictures:
 * 1. Place your image files (e.g. 01.jpg, 02.jpg) in the 'public/highlights/' folder.
 * 2. Add an entry below with src: '/highlights/01.jpg' and caption: '...'.
 * If this array is empty, the entire highlights slider section is automatically hidden.
 */
export const HIGHLIGHTS: HighlightItem[] = [];
