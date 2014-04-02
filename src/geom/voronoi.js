import "../core/functor";
import "voronoi/";
import "geom";
import "point";

d3.geom.voronoi = function(points) {
  var x = d3_geom_pointX,
      y = d3_geom_pointY,
      fx = x,
      fy = y,
      clipExtent = d3_geom_voronoiClipExtent;

  // @deprecated; use voronoi(data) instead.
  if (points) return voronoi(points);

  function voronoi(data) {
    var polygons = new Array(data.length),
        x0 = clipExtent[0][0],
        y0 = clipExtent[0][1],
        x1 = clipExtent[1][0],
        y1 = clipExtent[1][1];

    d3_geom_voronoi(sites(data), clipExtent).cells.forEach(function(cell, i) {
      var edges = cell.edges,
          site = cell.site,
          polygon = polygons[i] = edges.length ? edges.map(function(e) { var s = e.start(); return [s.x, s.y]; })
              : site.x >= x0 && site.x <= x1 && site.y >= y0 && site.y <= y1 ? [[x0, y1], [x1, y1], [x1, y0], [x0, y0]]
              : [];
      polygon.point = data[i];
    });

    return polygons;
  }

  function sites(data) {
    return data.map(function(d, i) {
      return {
        x: Math.round(fx(d, i) / ε) * ε,
        y: Math.round(fy(d, i) / ε) * ε,
        i: i
      };
    });
  }

  voronoi.topology = function(data) {
    var geometries = new Array(data.length),
        x0 = clipExtent[0][0],
        y0 = clipExtent[0][1],
        x1 = clipExtent[1][0],
        y1 = clipExtent[1][1],
        arcs = [],
        arcIndex = -1,
        arcIndexByEdge = {};

    d3_geom_voronoi(sites(data), clipExtent).cells.map(function(cell, i) {
      var edges = cell.edges,
          site = cell.site,
          arcIndexes = [],
          clipArc;

      if (edges.length) {
        edges.forEach(function(half) {
          var edge = half.edge;
          if (edge.r) {
            var l = edge.l.i,
                r = edge.r.i,
                k = l + "," + r,
                i = arcIndexByEdge[k];
            if (i == null) arcs[i = arcIndexByEdge[k] = ++arcIndex] = [[edge.a.x, edge.a.y], [edge.b.x, edge.b.y]];
            arcIndexes.push(half.site === edge.l ? i : ~i);
            clipArc = null;
          } else if (clipArc) { // consolidate clip edges
            clipArc.push([edge.b.x, edge.b.y]);
          } else {
            arcs[++arcIndex] = clipArc = [[edge.a.x, edge.a.y], [edge.b.x, edge.b.y]];
            arcIndexes.push(arcIndex);
          }
        });

        // Ensure the last point in the polygon is identical to the first point.
        var firstArcIndex = arcIndexes[0],
            lastArcIndex = arcIndexes[arcIndexes.length - 1],
            firstArc = arcs[firstArcIndex < 0 ? ~firstArcIndex : firstArcIndex],
            lastArc = arcs[lastArcIndex < 0 ? ~lastArcIndex : lastArcIndex];
        lastArc[lastArcIndex < 0 ? 0 : lastArc.length - 1] = firstArc[firstArcIndex < 0 ? firstArc.length - 1 : 0].slice();
      } else if (site.x >= x0 && site.x <= x1 && site.y >= y0 && site.y <= y1) {
        arcs[++arcIndex] = [[x0, y1], [x1, y1], [x1, y0], [x0, y0], [x0, y1]];
        arcIndexes.push(arcIndex);
      }

      geometries[i] = {
        type: "Polygon",
        arcs: [arcIndexes]
      };
    });

    return {
      objects: {
        voronoi: {
          type: "GeometryCollection",
          geometries: geometries
        }
      },
      arcs: arcs
    };
  };

  voronoi.links = function(data) {
    return d3_geom_voronoi(sites(data)).edges.filter(function(edge) {
      return edge.l && edge.r;
    }).map(function(edge) {
      return {
        source: data[edge.l.i],
        target: data[edge.r.i]
      };
    });
  };

  voronoi.triangles = function(data) {
    var triangles = [];

    d3_geom_voronoi(sites(data)).cells.forEach(function(cell, i) {
      var site = cell.site,
          edges = cell.edges.sort(d3_geom_voronoiHalfEdgeOrder),
          j = -1,
          m = edges.length,
          e0,
          s0,
          e1 = edges[m - 1].edge,
          s1 = e1.l === site ? e1.r : e1.l;

      while (++j < m) {
        e0 = e1;
        s0 = s1;
        e1 = edges[j].edge;
        s1 = e1.l === site ? e1.r : e1.l;
        if (i < s0.i && i < s1.i && d3_geom_voronoiTriangleArea(site, s0, s1) < 0) {
          triangles.push([data[i], data[s0.i], data[s1.i]]);
        }
      }
    });

    return triangles;
  };

  voronoi.x = function(_) {
    return arguments.length ? (fx = d3_functor(x = _), voronoi) : x;
  };

  voronoi.y = function(_) {
    return arguments.length ? (fy = d3_functor(y = _), voronoi) : y;
  };

  voronoi.clipExtent = function(_) {
    if (!arguments.length) return clipExtent === d3_geom_voronoiClipExtent ? null : clipExtent;
    clipExtent = _ == null ? d3_geom_voronoiClipExtent : _;
    return voronoi;
  };

  // @deprecated; use clipExtent instead.
  voronoi.size = function(_) {
    if (!arguments.length) return clipExtent === d3_geom_voronoiClipExtent ? null : clipExtent && clipExtent[1];
    return voronoi.clipExtent(_ && [[0, 0], _]);
  };

  return voronoi;
};

var d3_geom_voronoiClipExtent = [[-1e6, -1e6], [1e6, 1e6]];

function d3_geom_voronoiTriangleArea(a, b, c) {
  return (a.x - c.x) * (b.y - a.y) - (a.x - b.x) * (c.y - a.y);
}
