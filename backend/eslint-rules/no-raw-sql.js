/**
 * ESLint rule per bloccare $queryRaw e $executeRaw fuori dalla whitelist
 * Milestone 5 - Audit & blocco query pericolose
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Blocca l\'uso di $queryRaw e $executeRaw fuori dalla whitelist autorizzata',
      category: 'Security',
      recommended: true
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          whitelist: {
            type: 'array',
            items: {
              type: 'string'
            }
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      noRawSql: 'Uso di {{method}} non autorizzato. Solo i file nella whitelist possono usare query raw SQL.',
      noRawSqlWithFile: 'File {{filename}} non è nella whitelist per {{method}}. Usa wrapper sicuri o richiedi autorizzazione.'
    }
  },

  create(context) {
    const options = context.options[0] || {};
    const whitelist = options.whitelist || [
      // Whitelist iniziale - solo file di migrazione e utility specifiche
      'migrations/',
      'seeds/',
      'scripts/backfill',
      'utils/rawSqlWrapper.ts'
    ];

    const filename = context.getFilename();
    const isWhitelisted = whitelist.some(pattern => 
      filename.includes(pattern.replace(/\//g, '\\'))
    );

    return {
      MemberExpression(node) {
        // Rileva $queryRaw e $executeRaw
        if (
          node.property &&
          node.property.name &&
          (node.property.name === '$queryRaw' || node.property.name === '$executeRaw')
        ) {
          if (!isWhitelisted) {
            context.report({
              node,
              messageId: 'noRawSqlWithFile',
              data: {
                method: node.property.name,
                filename: filename.split('\\').pop()
              }
            });
          }
        }
      },

      // Rileva anche template literals con Prisma.$queryRaw
      TaggedTemplateExpression(node) {
        if (
          node.tag &&
          node.tag.type === 'MemberExpression' &&
          node.tag.property &&
          (node.tag.property.name === '$queryRaw' || node.tag.property.name === '$executeRaw')
        ) {
          if (!isWhitelisted) {
            context.report({
              node,
              messageId: 'noRawSqlWithFile',
              data: {
                method: node.tag.property.name,
                filename: filename.split('\\').pop()
              }
            });
          }
        }
      }
    };
  }
};