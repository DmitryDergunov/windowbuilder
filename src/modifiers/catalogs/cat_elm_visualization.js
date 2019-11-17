/**
 * ### Дополнительные методы справочника Визуализация элементов
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2018
 *
 * Created 08.04.2016
 *
 * @module cat_elm_visualization
 */

// публичные методы объекта
$p.CatElm_visualization.prototype.__define({

  /**
   *
   * @param elm {BuilderElement}
   * @param layer {Contour}
   * @param offset {Number|[Number,Number]}
   */
	draw: {
		value(elm, layer, offset) {

		  const {CompoundPath, PointText, Path, constructor} = elm.project._scope;

			let subpath;

			if(this.svg_path.indexOf('{"method":') == 0){

				const attr = JSON.parse(this.svg_path);

        if(['subpath_inner', 'subpath_outer', 'subpath_generatrix', 'subpath_median'].includes(attr.method)) {
          if(attr.method == 'subpath_outer') {
            subpath = elm.rays.outer.get_subpath(elm.corns(1), elm.corns(2)).equidistant(attr.offset || 10);
          }
          else if(attr.method == 'subpath_inner') {
            subpath = elm.rays.inner.get_subpath(elm.corns(3), elm.corns(4)).equidistant(attr.offset || 10);
          }
          else if(attr.method == 'subpath_median') {
            if(elm.is_linear()) {
              subpath = new Path({segments: [elm.corns(1).add(elm.corns(4)).divide(2), elm.corns(2).add(elm.corns(3)).divide(2)]})
                .equidistant(attr.offset || 0);
            }
            else {
              const inner = elm.rays.inner.get_subpath(elm.corns(3), elm.corns(4));
              inner.reverse();
              const outer = elm.rays.outer.get_subpath(elm.corns(1), elm.corns(2));
              const li = inner.length / 50;
              const lo = outer.length / 50;
              subpath = new Path();
              for(let i = 0; i < 50; i++) {
                subpath.add(inner.getPointAt(li * i).add(outer.getPointAt(lo * i)).divide(2));
              }
              subpath.simplify(0.8);
              if(attr.offset) {
                subpath = subpath.equidistant(attr.offset);
              }
            }
          }
          else {
            subpath = elm.generatrix.get_subpath(elm.b, elm.e).equidistant(attr.offset || 0);
          }
          subpath.parent = layer._by_spec;
          subpath.strokeWidth = attr.strokeWidth || 4;
          subpath.strokeColor = attr.strokeColor || 'red';
          subpath.strokeCap = attr.strokeCap || 'round';
          if(attr.dashArray){
            subpath.dashArray = attr.dashArray
          }
        }
			}
			else if(this.svg_path){

        if(this.mode === 1) {
          const attr = JSON.parse(this.attributes || '{}');
          subpath = new PointText(Object.assign({
            parent: layer._by_spec,
            fillColor: 'black',
            fontFamily: $p.job_prm.builder.font_family,
            fontSize: attr.fontSize || 60,
            guide: true,
            content: this.svg_path,
          }, attr));
        }
        else {
          subpath = new CompoundPath({
            pathData: this.svg_path,
            parent: layer._by_spec,
            strokeColor: 'black',
            fillColor: elm.constructor.clr_by_clr.call(elm, elm._row.clr, false),
            strokeScaling: false,
            guide: true,
            pivot: [0, 0],
            opacity: elm.opacity
          });
        }

				if(elm instanceof constructor.Filling) {
          subpath.position = elm.bounds.topLeft.add(offset);
        }
        else {
          const {generatrix, rays: {inner, outer}} = elm;
          // угол касательной
          let angle_hor;
          if(elm.is_linear() || offset < 0)
            angle_hor = generatrix.getTangentAt(0).angle;
          else if(offset > generatrix.length)
            angle_hor = generatrix.getTangentAt(generatrix.length).angle;
          else
            angle_hor = generatrix.getTangentAt(offset).angle;

          if((this.rotate != -1 || elm.orientation == $p.enm.orientations.Горизонтальная) && angle_hor != this.angle_hor){
            subpath.rotation = angle_hor - this.angle_hor;
          }

          offset += generatrix.getOffsetOf(generatrix.getNearestPoint(elm.corns(1)));

          const p0 = generatrix.getPointAt(offset > generatrix.length ? generatrix.length : offset || 0);

          if(this.elm_side == -1){
            // в середине элемента
            const p1 = inner.getNearestPoint(p0);
            const p2 = outer.getNearestPoint(p0);

            subpath.position = p1.add(p2).divide(2);

          }else if(!this.elm_side){
            // изнутри
            subpath.position = inner.getNearestPoint(p0);

          }else{
            // снаружи
            subpath.position = outer.getNearestPoint(p0);
          }
        }

			}
		}
	}

});
