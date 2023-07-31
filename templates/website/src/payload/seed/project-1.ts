import type { Project } from '../payload-types'

export const project1: Partial<Project> = {
  title: 'Project 1',
  slug: 'project-1',
  _status: 'published',
  meta: {
    title: 'Project 1',
    description: 'This is project 1',
    image: '{{PROJECT_IMAGE}}',
  },
  hero: {
    type: 'lowImpact',
    links: [],
    media: '',
    richText: [
      {
        type: 'h1',
        children: [
          {
            text: 'Project 1',
          },
        ],
      },
      {
        type: 'p',
        children: [
          {
            text: 'This is project 1. This hero and the content on this page is completely dynamic and ',
          },
          {
            type: 'link',
            linkType: 'custom',
            url: '/admin',
            children: [
              {
                text: 'configured in the admin dashboard',
              },
            ],
          },
        ],
      },
    ],
  },
  layout: [
    {
      blockType: 'content',
      columns: [
        {
          size: 'twoThirds',
          richText: [
            {
              children: [
                {
                  text: "All content from this point is completely dynamic using custom layout building block configured in the CMS. This can be anything you'd like.",
                },
              ],
            },
          ],
          link: {
            reference: {
              relationTo: 'pages',
              value: '',
            },
            url: '',
            label: '',
          },
        },
      ],
    },
  ],
}