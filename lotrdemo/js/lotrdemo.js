"use strict";
// lotrdemo.js

//setup connection to Neo4j database
//todo : make this configurable
var neo4j = window.neo4j.v1;
var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "trinity"));
var cy;

document.addEventListener("DOMContentLoaded", function() {
	// create visualization layer
	cy = cytoscape({
		container: document.getElementById("cy"),
		style: [{
			"selector": "node[neo4j_label*=\"Character\"]",
			"style": {
				"content": "data(name)",
				"background-color": "data(bg)",
				"background-fit": "cover"
			}
		},
		{
			"selector": "edge",
			"style": {
				"width" : 3,
				"curve-style": "unbundled-bezier",
				"target-arrow-shape": "triangle"
			}
		}]
	});
    
    $("#sourcecharacter").autocomplete({
    	source: function(request, response) {
    		var session = driver.session();
    		
    		const cypher =  "MATCH (c:Character) WHERE c.name STARTS WITH $term RETURN DISTINCT c.name AS name ORDER BY name;"
   			const params = { term: request.term };
    		
    		return session.run(cypher, params)
    		.then(result => {
    			session.close();
    			
    			var names = [];
    			
    			result.records.forEach(res => {
    				names.push(res.get("name"));
    			});
    			
    			response(names);
    		})
    		.catch (error => {
    			session.close();
    			response([]);
    		});	    		
    	}
    });
    
    $("#targetcharacter").autocomplete({
    	source: function(request, response) {
    		var session = driver.session();

    		const cypher =  "MATCH (c:Character) WHERE c.name STARTS WITH $term RETURN DISTINCT c.name AS name ORDER BY name;"
    		const params = { term: request.term };

    		return session.run(cypher, params)
    		.then(result => {
    			session.close();
    			
    			var names = [];
    			
    			result.records.forEach(res => {
    				names.push(res.get("name"));
    			});
    			
    			response(names);
    		})
    		.catch (error => {
    			session.close();
    			response([]);
    		});	    		
    	}
    });
	
	// wait for visualization layer to become available
	cy.ready(function(event) {
		reDraw();
		
		// if browser window is resized, redraw the visualization
		$(window).resize(function() {
			if(this.resizeTO) clearTimeout(this.resizeTO);
			this.resizeTO = setTimeout(function() {
				$(this).trigger("resizeEnd");
			}, 500);
		});
		$(window).bind("resizeEnd", function() {
			reDraw();
		});
		
		// if the button is clicked, take action
		$("#lotrall").click(function(ev) {
			ev.preventDefault();
			visualizeAll();
		});

		$("#lotrform").submit(function(ev) {
			ev.preventDefault();
			visualizePath($("#sourcecharacter").val(), $("#targetcharacter").val());
		});
	});
});

//(re)Drawing the visualization layer
function reDraw() {
	$("#cy").height($(window).innerHeight() - 70);
	
	cy.resize();
	
	var layoutoptions = {
			name: 'concentric',
			concentric: function( ele ){ return ele.data('betweenness'); },
			spacingFactor: 5,
			levelWidth: function( nodes ){ return 10; },
			padding: 10
	}

//	var layoutoptions = {
//			name: 'cose',
//
//			// Called on `layoutready`
//			ready: function(){},
//
//			// Called on `layoutstop`
//			stop: function(){},
//
//			// Whether to animate while running the layout
//			// true : Animate continuously as the layout is running
//			// false : Just show the end result
//			// 'end' : Animate with the end result, from the initial positions to the end positions
//			animate: true,
//
//			// Easing of the animation for animate:'end'
//			animationEasing: undefined,
//
//			// The duration of the animation for animate:'end'
//			animationDuration: undefined,
//
//			// A function that determines whether the node should be animated
//			// All nodes animated by default on animate enabled
//			// Non-animated nodes are positioned immediately when the layout starts
//			animateFilter: function ( node, i ){ return true; },
//
//
//			// The layout animates only after this many milliseconds for animate:true
//			// (prevents flashing on fast runs)
//			animationThreshold: 250,
//
//			// Number of iterations between consecutive screen positions update
//			// (0 -> only updated on the end)
//			refresh: 20,
//
//			// Whether to fit the network view after when done
//			fit: true,
//
//			// Padding on fit
//			padding: 30,
//
//			// Constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
//			boundingBox: undefined,
//
//			// Excludes the label when calculating node bounding boxes for the layout algorithm
//			nodeDimensionsIncludeLabels: false,
//
//			// Randomize the initial positions of the nodes (true) or use existing positions (false)
//			randomize: false,
//
//			// Extra spacing between components in non-compound graphs
//			componentSpacing: 40,
//
//			// Node repulsion (non overlapping) multiplier
//			nodeRepulsion: function( node ){ return 2048; },
//
//			// Node repulsion (overlapping) multiplier
//			nodeOverlap: 4,
//
//			// Ideal edge (non nested) length
//			idealEdgeLength: function( edge ){ return 32; },
//
//			// Divisor to compute edge forces
//			edgeElasticity: function( edge ){ return 32; },
//
//			// Nesting factor (multiplier) to compute ideal edge length for nested edges
//			nestingFactor: 1.2,
//
//			// Gravity force (constant)
//			gravity: 1,
//
//			// Maximum number of iterations to perform
//			numIter: 1000,
//
//			// Initial temperature (maximum node displacement)
//			initialTemp: 1000,
//
//			// Cooling factor (how the temperature is reduced between consecutive iterations
//			coolingFactor: 0.99,
//
//			// Lower temperature threshold (below this point the layout will end)
//			minTemp: 1.0,
//
//			// Pass a reference to weaver to use threads for calculations
//			weaver: false
//	};

	cy.elements().layout(layoutoptions).run();
}

//visualize all
function visualizeAll() {
	cy.remove(cy.$("*"));
	
	var session = driver.session();
	
	const cypher =  "MATCH p=(c1:Character)-[]-(c2:Character) RETURN DISTINCT p;"
	const params = {};
	
	return session.run(cypher, params)
	.then(result => {
		session.close();
		result.records.forEach(res => {
			res.get("p")["segments"].forEach(segment => {
				checkandaddNode(segment["start"]);
				checkandaddNode(segment["end"]);
				checkandaddEdge(segment["relationship"]);
			})
		});
		reDraw();
	})
	.catch (error => {
		session.close();
	});	
}

//visualize one path
function visualizePath(source, target) {
	cy.remove(cy.$("*"));
	
	var session = driver.session();

	const cypher = "MATCH p=shortestPath((c1:Character)-[*]-(c2:Character)) WHERE c1.name = $source AND c2.name = $target RETURN p;";
	const params = { source: source, target: target};

	return session.run(cypher, params)
	.then(result => {
		session.close();
		result.records.forEach(res => {
			res.get("p")["segments"].forEach(segment => {
				checkandaddNode(segment["start"]);
				checkandaddNode(segment["end"]);
				checkandaddEdge(segment["relationship"]);
			})
		});
		reDraw();
	})
	.catch (error => {
		session.close();
	});
}


//verify if node exists, add it if it doesn't
function checkandaddNode(node) {
	var found = cy.$id("node_" + node.identity.low);
	if (found["length"] == 0) {
		var output = {
				id: "node_" + node.identity.low,
				neo4j_id: node.identity.low,
				neo4j_label: node.labels.join()
		}

		Object.keys(node.properties).forEach(key => {
			if (key == "id") {
				output["node_id"] = node.properties[key];
			}
			else {
				output[key] = node.properties[key];
			}
		});
		
		cy.add({
			group: "nodes",
			data: output
		});
		// console.log("node_" + node.identity.low + " created");
	}
	else {
		// console.log("node_" + node.identity.low + " already exists");
	}
}

//verify if edge exists, add it if it doesn't
function checkandaddEdge(edge) {
	var found = cy.$id("edge_" + edge.identity.low);
	if (found["length"] == 0) {
		var output = {
				id: "edge_" + edge.identity.low,
				neo4j_id: edge.identity.low,
				neo4j_type: edge.type,
				source: "node_" + edge.start.low,
				target: "node_" + edge.end.low
		}

		Object.keys(edge.properties).forEach(key => {
			output[key] = edge.properties[key];
		});
		
		cy.add({
			group: "edges",
			data: output
		});
		// console.log("edge_" + edge.identity.low + " created between node_" + edge.start.low + " and node_" + edge.end.low);
	}
	else {
		// console.log("edge_" + edge.identity.low + " already exists");
	}
}
