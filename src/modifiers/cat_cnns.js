/**
 * Дополнительные методы справочника Соединения
 *
 * Created 23.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module cat_cnns
 */


$p.modifiers.push(
	function($p) {

		var _mgr = $p.cat.cnns,
			_nomcache = {};

		// приватные поля и методы

		// модификаторы

		_mgr.sql_selection_list_flds = function(initial_value){
			return "SELECT _t_.ref, _t_.`deleted`, _t_.is_folder, _t_.id, _t_.name as presentation, _k_.synonym as cnn_type," +
				" case when _t_.ref = '" + initial_value + "' then 0 else 1 end as is_initial_value FROM cat_cnns AS _t_" +
				" left outer join enm_cnn_types as _k_ on _k_.ref = _t_.cnn_type %3 %4 LIMIT 300";
		};


		// публичные поля и методы

		/**
		 * Возвращает массив соединений, доступный для сочетания номенклатур.
		 * Для соединений с заполнениями учитывается толщина. Контроль остальных геометрических особенностей выполняется на стороне рисовалки
		 * @param nom1 {_cat.nom}
		 * @param nom2 {_cat.nom}
		 * @return {Array}
		 */
		_mgr.nom_cnn = function(nom1, nom2){

			if(!nom1 || nom1.empty())
				return [];

			var onom1 = $p.is_data_obj(nom1) ? nom1 : $p.cat.nom.get(nom1), onom2,
				is_i = false, art1glass = false, art2glass = false,
				a1, a2;

			if(!nom2 || nom2.empty()){
				is_i = true;
				nom2 = {val: "i"};
			}
			else
				onom2 = $p.is_data_obj(nom2) ? nom2 : $p.cat.nom.get(nom2);

			if(!is_i){
				if($p.enm.elm_types.glasses.indexOf(onom1.elm_type) != -1)
					art1glass = true;
				else if($p.enm.elm_types.glasses.indexOf(onom2.elm_type) != -1)
					art2glass = true;
			}

			if(!_nomcache[nom1.ref])
				_nomcache[nom1.ref] = {};
			a1 = _nomcache[nom1.ref];
			if(!a1[nom2.ref]){
				a2 = (a1[nom2.ref] = []);
				// для всех элементов справочника соединения
				_mgr.each(function(оCnn){
					// если в строках соединяемых элементов есть наша - добавляем
					var is_nom1 = art1glass ? (оCnn.art1glass && onom1.thickness >= Number(оCnn.tmin) && onom1.thickness <= Number(оCnn.tmax)) : false,
						is_nom2 = art2glass ? (оCnn.art2glass && onom2.thickness >= Number(оCnn.tmin) && onom2.thickness <= Number(оCnn.tmax)) : false;

					оCnn["cnn_elmnts"].each(function(row){
						if(is_nom1 && is_nom2)
							return false;
						is_nom1 = is_nom1 || $p.is_equal(row.nom1, nom1);
						is_nom2 = is_nom2 || $p.is_equal(row.nom2, nom2);
					});
					if(is_nom1 && is_nom2){
						a2.push(оCnn);
					}
				});
			}

			return a1[nom2.ref];
		};

		_mgr.nom_cnn_type = function (nom1, nom2, cnn_type) {
			var tmp = _mgr.nom_cnn(nom1, nom2),
				res = [], types;
			if($p.enm.cnn_types.acn.a.indexOf(cnn_type) != -1)
				types = $p.enm.cnn_types.acn.a;
			else
				types = [cnn_type];

			tmp.forEach(function (c) {
				if(types.indexOf(c.cnn_type) != -1)
					res.push(c);
			});
			return res;

		};

		/**
		 * Формирует строки соединений для построителя и конструирует $p.CN
		 * @param osys {CatObj} - объект справочника "системы"
		 * @param o {CatObj} - объект справочника "характеристики"
		 */
		_mgr.make_istr = function(osys, o){

			var iCn = "", iCnn = "", iC = "",
				aNom = osys.noms, aCnn = [], оCnn, tStr;

			// бежим по соединениям и накапливам те, в которых есть номенклатура системы
			_mgr.alatable.forEach(function(оCnn){
				if(оCnn["cnn_elmnts"] && оCnn["cnn_elmnts"].some(function(row){
						return aNom.indexOf(row.nom1) != -1 || aNom.indexOf(row.nom2) != -1
					}))
					aCnn.push(оCnn);
			});

			// фильтруем соединения и дополняем строки
			for(var i in aCnn){
				оCnn = aCnn[i];

				if(iCn) iCn = iCn + "¶";
				tStr = оCnn.id + ";" +
					оCnn.cnn_type + ";" +
					оCnn.sz + ";" +
					оCnn.sd1 + ";" +
					оCnn.sd2 + ";" +
					оCnn.amin + ";" +
					оCnn.amax + ";" +
					оCnn.rmin + ";" +
					оCnn.rmax + ";" +
					оCnn.lmin + ";" +
					оCnn.lmax + ";" +
					оCnn.tmin + ";" +
					оCnn.tmax + ";" +
					(оCnn.var_layers ? 1 : "") + ";" +
					оCnn.priority + ";" +
					(оCnn.art1vert ? 1 : "") + ";" +
					(оCnn.art1glass ? 1 : "") + ";" +
					оCnn.ahmin + ";" +
					оCnn.ahmax + ";" +
					(оCnn.art2glass ? 1 : "");
				iCn = iCn + tStr;

				оCnn["cnn_elmnts"].forEach(function(row1){
					if($p.is_empty_guid(row1.nom1)){
						оCnn["cnn_elmnts"].forEach(function(row2){
							if(row1==row2){
								return;

							}else if(
								$p.is_empty_guid(row2.nom1) ||
								!$p.is_empty_guid(row2.nom2) ||
								(aNom.indexOf(row2.nom1) == -1 && !оCnn.art1glass )||
								(aNom.indexOf(row1.nom2) == -1 && !оCnn.art2glass)
							){
								;

							}else{
								tStr = оCnn.id + ";" +
									$p.cat.nom.get(row2.nom1).id + ";" +
									$p.cat.nom.get(row1.nom2).id + ";" +
									($p.is_empty_guid(row2.clr1) ? 0 : $p.cat["clrs"].get(row2.clr1).id) + ";" +
									($p.is_empty_guid(row1.clr2) ? 0 : $p.cat["clrs"].get(row1.clr2).id) + ";" +
									(row1.varclr || row2.varclr ? 1 : "");
								if(iCnn) iCnn = iCnn + "¶";
								iCnn = iCnn + tStr;
							}
						});
					}else if(!(aNom.indexOf(row1.nom1) != -1 || $p.is_empty_guid(row1.nom1)) || !(aNom.indexOf(row1.nom2) != -1 || $p.is_empty_guid(row1.nom2))){
						;

					}else{
						tStr = оCnn.id + ";" +
							($p.is_empty_guid(row1.nom1) ? "0" : $p.cat.nom.get(row1.nom1).id) + ";" +
							($p.is_empty_guid(row1.nom2) ? "0" : $p.cat.nom.get(row1.nom2).id) + ";" +
							($p.is_empty_guid(row1.clr1) ? 0 : $p.cat["clrs"].get(row1.clr1).id) + ";" +
							($p.is_empty_guid(row1.clr2) ? 0 : $p.cat["clrs"].get(row1.clr2).id) + ";" +
							(row1.varclr ? 1 : "");
						if(iCnn) iCnn = iCnn + "¶";
						iCnn = iCnn + tStr;
					}
				});
			}

			// формируем строку соединений текущей продукции
			o["cnn_elmnts"]._obj.forEach(function(row){
				if(iC) iC = iC + "¶";
				iC = iC + row.elm1 + ";" + row.elm2 + ";" + _mgr.get(row["cnn"]).id;
			});

			$p.CN = new $p.ex.RCnn(iCn, iCnn, iC, osys["allow_open_cnn"]);
		}

	}
);