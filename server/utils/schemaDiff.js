/**
 * Compares two Modellr Canvas States and returns structural diffs.
 * @param {Object} oldState { tables: [], relationships: [] }
 * @param {Object} newState { tables: [], relationships: [] }
 */
export function diffSchemas(oldState, newState) {
  const oldTables = oldState?.tables || [];
  const newTables = newState?.tables || [];

  const addedTables = newTables.filter(nt => !oldTables.find(ot => ot.name === nt.name));
  const removedTables = oldTables.filter(ot => !newTables.find(nt => nt.name === ot.name));

  const modifiedTables = [];

  for (const newTable of newTables) {
    const oldTable = oldTables.find(ot => ot.name === newTable.name);
    if (!oldTable) continue;

    const addedFields = newTable.fields.filter(nf => !oldTable.fields.find(of => of.name === nf.name));
    const removedFields = oldTable.fields.filter(of => !newTable.fields.find(nf => nf.name === of.name));

    const modifiedFields = [];
    for (const newField of newTable.fields) {
      const oldField = oldTable.fields.find(of => of.name === newField.name);
      if (oldField) {
        const changes = {};
        if (oldField.type !== newField.type) changes.type = { from: oldField.type, to: newField.type };
        if (oldField.nullable !== newField.nullable) changes.nullable = { from: oldField.nullable, to: newField.nullable };
        if (oldField.default !== newField.default) changes.default = { from: oldField.default, to: newField.default };

        if (Object.keys(changes).length > 0) {
          modifiedFields.push({ name: newField.name, changes });
        }
      }
    }

    if (addedFields.length > 0 || removedFields.length > 0 || modifiedFields.length > 0) {
      modifiedTables.push({
        name: newTable.name,
        addedFields,
        removedFields,
        modifiedFields
      });
    }
  }

  return {
    addedTables,
    removedTables,
    modifiedTables,
    // Relationships could be added here in a future phase
    addedRelationships: (newState?.relationships || []).filter(nr => !(oldState?.relationships || []).find(or => or.id === nr.id)),
    removedRelationships: (oldState?.relationships || []).filter(or => !(newState?.relationships || []).find(nr => nr.id === or.id))
  };
}
