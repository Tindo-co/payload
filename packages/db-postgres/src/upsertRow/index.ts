/* eslint-disable no-param-reassign */
import { Field } from 'payload/types';
import { SQL } from 'drizzle-orm';
import { PostgresAdapter } from '../types';
import { traverseFields } from './traverseFields';
import { transform } from '../transform';
import { BlockRowToInsert, RowToInsert } from './types';
import { insertArrays } from './insertArrays';

type Args = {
  adapter: PostgresAdapter
  data: Record<string, unknown>
  fallbackLocale?: string | false
  fields: Field[]
  locale: string
  operation: 'create' | 'update'
  path?: string
  query?: SQL<unknown>
  tableName: string
}

export const upsertRow = async ({
  adapter,
  data,
  fallbackLocale,
  fields,
  locale,
  operation,
  path = '',
  query,
  tableName,
}: Args): Promise<Record<string, unknown>> => {
  // Split out the incoming data into the corresponding:
  // base row, locales, relationships, blocks, and arrays
  const rowToInsert: RowToInsert = {
    row: {},
    locale: {},
    relationships: [],
    blocks: {},
    arrays: {},
  };

  // This function is responsible for building up the
  // above rowToInsert
  traverseFields({
    adapter,
    arrays: rowToInsert.arrays,
    blocks: rowToInsert.blocks,
    columnPrefix: '',
    data,
    fields,
    locale,
    localeRow: rowToInsert.locale,
    newTableName: tableName,
    parentTableName: tableName,
    path,
    relationships: rowToInsert.relationships,
    row: rowToInsert.row,
  });

  let insertedRow: Record<string, unknown>;

  // First, we insert / update the main row
  if (operation === 'create') {
    [insertedRow] = await adapter.db.insert(adapter.tables[tableName])
      .values(rowToInsert.row).returning();
  } else {
    [insertedRow] = await adapter.db.update(adapter.tables[tableName])
      .set(rowToInsert.row).where(query).returning();
  }

  let localeToInsert: Record<string, unknown>;
  const relationsToInsert: Record<string, unknown>[] = [];
  const blocksToInsert: { [blockType: string]: BlockRowToInsert[] } = {};

  // Maintain a list of promises to run locale, blocks, and relationships
  // all in parallel
  const promises = [];

  // If there is a locale row with data, add the parent and locale
  if (Object.keys(rowToInsert.locale).length > 0) {
    rowToInsert.locale._parentID = insertedRow.id;
    rowToInsert.locale._locale = locale;
    localeToInsert = rowToInsert.locale;
  }

  // If there are relationships, add parent to each
  if (rowToInsert.relationships.length > 0) {
    rowToInsert.relationships.forEach((relation) => {
      relation.parent = insertedRow.id;
      relationsToInsert.push(relation);
    });
  }

  // If there are blocks, add parent to each, and then
  // store by table name and rows
  Object.keys(rowToInsert.blocks).forEach((blockName) => {
    rowToInsert.blocks[blockName].forEach((blockRow) => {
      blockRow.row._parentID = insertedRow.id;
      if (!blocksToInsert[blockName]) blocksToInsert[blockName] = [];
      blocksToInsert[blockName].push(blockRow);
    });
  });

  if (operation === 'update') {
    // TODO: delete existing data for paths that are updated
    // 1. Arrays, and all sub-arrays from that point on including all locales
    // 2. Blocks by path including locales, and sub arrays
    // 3. Relationships by path
  }

  // //////////////////////////////////
  // INSERT LOCALES
  // //////////////////////////////////

  let insertedLocaleRow;

  if (localeToInsert) {
    promises.push(async () => {
      if (operation === 'create') {
        [insertedLocaleRow] = await adapter.db.insert(adapter.tables[`${tableName}_locales`])
          .values(localeToInsert).returning();
      } else {
        // TODO: QUERY for existing locale by parent ID, to get its ID
        // and upsert if it doesn't exist already
      }
    });
  }

  // //////////////////////////////////
  // INSERT RELATIONSHIPS
  // //////////////////////////////////

  let insertedRelationshipRows: Record<string, unknown>[];

  if (relationsToInsert.length > 0) {
    promises.push(async () => {
      insertedRelationshipRows = await adapter.db.insert(adapter.tables[`${tableName}_relationships`])
        .values(relationsToInsert).returning();
    });
  }

  // //////////////////////////////////
  // INSERT BLOCKS
  // //////////////////////////////////

  const insertedBlockRows: Record<string, Record<string, unknown>[]> = {};

  Object.entries(blocksToInsert).forEach(([blockName, blockRows]) => {
    // For each block, push insert into promises to run parallel
    promises.push(async () => {
      insertedBlockRows[blockName] = await adapter.db.insert(adapter.tables[`${tableName}_${blockName}`])
        .values(blockRows.map(({ row }) => row)).returning();

      insertedBlockRows[blockName].forEach((row, i) => {
        delete row._parentID;
        blockRows[i].row = row;
      });

      const blockLocaleIndexMap: number[] = [];

      const blockLocaleRowsToInsert = blockRows.reduce((acc, blockRow, i) => {
        if (Object.keys(blockRow.locale).length > 0) {
          blockRow.locale._parentID = blockRow.row.id;
          blockRow.locale._locale = locale;
          acc.push(blockRow.locale);
          blockLocaleIndexMap.push(i);
          return acc;
        }

        return acc;
      }, []);

      if (blockLocaleRowsToInsert.length > 0) {
        const insertedBlockLocaleRows = await adapter.db.insert(adapter.tables[`${tableName}_${blockName}_locales`])
          .values(blockLocaleRowsToInsert).returning();

        insertedBlockLocaleRows.forEach((blockLocaleRow, i) => {
          delete blockLocaleRow._parentID;
          insertedBlockRows[blockName][blockLocaleIndexMap[i]]._locales = [blockLocaleRow];
        });
      }

      await insertArrays({
        adapter,
        arrays: blockRows.map(({ arrays }) => arrays),
        parentRows: insertedBlockRows[blockName],
      });
    });
  });

  // //////////////////////////////////
  // INSERT ARRAYS RECURSIVELY
  // //////////////////////////////////

  promises.push(async () => {
    await insertArrays({
      adapter,
      arrays: [rowToInsert.arrays],
      parentRows: [insertedRow],
    });
  });

  await Promise.all(promises.map((promise) => promise()));

  // //////////////////////////////////
  // TRANSFORM DATA
  // //////////////////////////////////

  if (insertedLocaleRow) insertedRow._locales = [insertedLocaleRow];
  if (insertedRelationshipRows?.length > 0) insertedRow._relationships = insertedRelationshipRows;

  Object.entries(insertedBlockRows).forEach(([blockName, blocks]) => {
    if (blocks.length > 0) insertedRow[`_blocks_${blockName}`] = blocks;
  });

  const result = transform({
    config: adapter.payload.config,
    data: insertedRow,
    fallbackLocale,
    fields,
    locale,
  });

  return result;
};
