CREATE CONSTRAINT ON (c:Character) ASSERT c.id IS UNIQUE;
CREATE INDEX ON :Character(name);

LOAD CSV WITH HEADERS FROM "file:///lotr/lotr_nodes.csv" AS row
WITH row
WHERE row.type = "per"
CREATE (:Character {id: row.id, name: row.label, race: row.subtype});

LOAD CSV WITH HEADERS FROM "file:///lotr/lotr_relationships.csv" AS row
MATCH (c1:Character {id: row.idsource})
MATCH (c2:Character {id: row.idtarget})
MERGE (c1)-[:RELATED_TO {weight: toInteger(row.weight)}]->(c2);

LOAD CSV WITH HEADERS FROM 'file:///lotr/lotr_nodes.csv' AS row
MATCH (c:Character) WHERE c.id = row.id
WITH c, CASE row.subtype
 WHEN 'men' THEN 'red'
 WHEN 'elves' THEN 'green'
 WHEN 'dwarf' THEN 'yellow'
 WHEN 'hobbit' THEN 'blue'
 ELSE 'black'
END AS bg
SET c.bg = bg;

CALL algo.betweenness('Character','RELATED_TO', {direction:'out',write:true, writeProperty:'betweenness'})
YIELD nodes, minCentrality, maxCentrality, sumCentrality, loadMillis, computeMillis, writeMillis;
