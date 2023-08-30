import path from 'path';
import { CollectionConfig } from '../../../../src/collections/config/types.js';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

export const Uploads2: CollectionConfig = {
  slug: 'uploads-2',
  upload: {
    staticDir: path.resolve(__dirname, './uploads'),
  },
  admin: {
    enableRichTextRelationship: false,
  },
  fields: [
    {
      type: 'text',
      name: 'title',
    },
  ],
};

export const uploadsDoc = {
  text: 'An upload here',
};

export default Uploads2;