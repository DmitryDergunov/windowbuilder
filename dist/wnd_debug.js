;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Wnd_debug = factory();
  }
}(this, function() {
/**
 * Дополнительные методы справочника Типовые блоки
 *
 * Created 23.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module cat_base_blocks
 */

$p.modifiers.push(
	function($p){

		var _mgr = $p.cat.base_blocks;

		_mgr.sql_selection_list_flds = function(initial_value){
			return "SELECT _t_.ref, _t_.`deleted`, _t_.is_folder, case when _t_.is_folder = '' then _t_.id || '&lt;br /&gt;' || _p_.name || '&lt;br /&gt; ' || _t_.name else _t_.name end as presentation, _t_.svg," +
				" case when _t_.ref = '" + initial_value + "' then 0 else 1 end as is_initial_value FROM cat_base_blocks AS _t_" +
				" left outer join cat_production_params as _p_ on _p_.ref = _t_.sys" +
				" %3 %4 LIMIT 300";
		};


	}
);
/**
 * Дополнительные методы справочника Характеристики номенклатуры
 *
 * Created 23.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module cat_characteristics
 */

$p.modifiers.push(
	function($p) {

		var _mgr = $p.cat.characteristics;

		_mgr.attache_event("before_save", function (attr) {
			var obj = this,
				data = {
					action: "save",
					obj: obj
				};

			// возможно, надо что-то дорассчитать-дозаполнить на клиенте
			// todo габариты изделия и цыфры в конструкциях
			// todo номера соединяемых элементов

			// записываем характеристику через форму 1С
			$p.eve.socket.send(data);


			return false;

		});


	}
);

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

/**
 * Дополнительные методы справочника Договоры контрагентов
 *
 * Created 23.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module cat_contracts
 */

$p.modifiers.push(
	function($p){

		var _mgr = $p.cat.contracts;

		_mgr.sql_selection_list_flds = function(initial_value){
			return "SELECT _t_.ref, _t_.`deleted`, _t_.is_folder, _t_.id, _t_.name as presentation, _k_.synonym as contract_kind, _m_.synonym as mutual_settlements, _o_.name as organization," +
				" case when _t_.ref = '" + initial_value + "' then 0 else 1 end as is_initial_value FROM cat_contracts AS _t_" +
				" left outer join cat_organizations as _o_ on _o_.ref = _t_.organization" +
				" left outer join enm_mutual_contract_settlements as _m_ on _m_.ref = _t_.mutual_settlements" +
				" left outer join enm_contract_kinds as _k_ on _k_.ref = _t_.contract_kind %3 %4 LIMIT 300";
		};

	}
);
/**
 * Дополнительные методы справочника Фурнитура
 *
 * Created 23.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module cat_furns
 */

$p.modifiers.push(
	function furns($p) {

		var _mgr = $p.cat.furns;


		_mgr.sql_selection_list_flds = function(initial_value){
			return "SELECT _t_.ref, _t_.`deleted`, _t_.is_folder, _t_.parent, case when _t_.is_folder then '' else _t_.id end as id, _t_.name as presentation, _k_.synonym as open_type, \
					 case when _t_.ref = '" + initial_value + "' then 0 else 1 end as is_initial_value FROM cat_furns AS _t_ \
					 left outer join enm_open_types as _k_ on _k_.ref = _t_.open_type %3 %4 LIMIT 300";
		};


		/**
		 * вычисляет список параметров и доступных значений фурнитуры
		 * @param attr {object} - условия, для которых надо получить список параметров
		 * @param callback {function} - функция обратного вызова
		 */
		_mgr.prms_get = function(attr, callback){

			var osys = $p.cat["production_params"].get(attr.sys),
				ofurn = _mgr.get(attr.ref),
				dp_buyers_order = $p.dp.buyers_order.create(),
				oprm = dp_buyers_order["product_params"],
				prm_direction = $p.cat.predefined_elmnts.by_name("Параметр_НаправлениеОткрывания").elm,
				aprm = [], afurn_set = [];

			function add_furn_prm(obj){

				if(afurn_set.indexOf(obj.ref)!=-1)
					return;

				afurn_set.push(obj.ref);

				obj.selection_params.each(function(row){
					if(aprm.indexOf(row.param.ref)==-1)
						aprm.push(row.param.ref);
				});

				obj.specification.each(function(row){
					if($p.is_data_obj(row.nom_set) && row.nom_set._manager === $p.cat.furns)
						add_furn_prm(row.nom_set);
				});
			}

			// загружаем в oprm параметры текущей фурнитуры
			if(!attr.refills)
				oprm.load(attr.fprms);

			// формируем массив требуемых параметров по задействованным в ofurn.furn_set
			if(!ofurn.furn_set.empty())
				add_furn_prm(ofurn.furn_set);

			// Приклеиваем значения по умолчанию
			var direction_added = ofurn.open_type.empty() ||
					ofurn.open_type == $p.enm.open_types.Глухое ||
					ofurn.open_type == $p.enm.open_types.Откидное,
				prm_row, prm_ref;

			aprm.forEach(function(v){

				prm_ref = {param: $p.cch.properties.get(v, false)};
				if(!(prm_row = oprm.find(prm_ref)))
					prm_row = oprm.add(prm_ref);

				if(!direction_added && $p.is_equal(prm_direction, prm_row.param))
					direction_added = true;

				osys.furn_params.each(function(row){
					if($p.is_equal(row.param, prm_row.param)){
						if(attr.refills || row.forcibly)
							prm_row.value = row.value;
						prm_row.hide = row.hide;
						return false;
					}
				});
			});

			if(!direction_added){
				osys.furn_params.each(function(row){
					if($p.is_equal(row.param, prm_direction)){
						prm_row = oprm.add({param: row.param, value: row.value, hide: row.hide});
						direction_added = true;
						return false;
					}
				});
			}

			// параметры и значения по умолчанию получены в oprm
			if((prm_row = oprm.find(prm_direction.ref)) && (prm_row.row > 1))
				oprm.swap(prm_row.row -1, 0);

			var res = {
				sub_type: ofurn.open_type.empty() ? "" : ofurn.open_type.name,
				furn_no: ofurn.id,
				fprms: []};
			oprm.each(function(row){
				res.fprms.push(row);
			});
			if(res.sub_type.toLowerCase() == $p.enm.tso.rotary_folding.toLowerCase())
				res.sub_type = $p.enm.tso.rotary_folding;

			callback(res);

		}

	}
);
/**
 * Дополнительные методы справочника Вставки
 *
 * Created 23.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module cat_inserts
 */

$p.modifiers.push(
	function($p){
		$p.cat.inserts._obj_сonstructor.prototype.__define("nom", {
			get: function () {
				return this.specification.count() ? this.specification.get(0).nom : $p.cat.nom.get();
			},
			enumerable: false
		});
	}
);

/**
 * Дополнительные методы справочника Номенклатура
 *
 * Created 23.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module cat_nom
 */

$p.modifiers.push(
	function($p) {

		var _mgr = $p.cat.nom;

		// модификаторы
		_mgr.sql_selection_list_flds = function(initial_value){
			return "SELECT _t_.ref, _t_.`deleted`, _t_.is_folder, _t_.id, _t_.article, _t_.name as presentation, _u_.name as nom_unit, _k_.name as nom_kind, _t_.thickness," +
				" case when _t_.ref = '" + initial_value + "' then 0 else 1 end as is_initial_value FROM cat_nom AS _t_" +
				" left outer join cat_units as _u_ on _u_.ref = _t_.base_unit" +
				" left outer join cat_nom_kinds as _k_ on _k_.ref = _t_.nom_kind %3 %4 LIMIT 300";
		};

		_mgr.sql_selection_where_flds = function(filter){
			return " OR _t_.article LIKE '" + filter + "' OR _t_.id LIKE '" + filter + "' OR _t_.name LIKE '" + filter + "'";
		};


		// публичные поля и методы

		/**
		 *	@desc: 	формирует строку описания номенклатуры для построителя
		 *	@param: 	oNom	- справочникОбъект Номенклатура
		 *	@param: 	row	(необязательный) - строка элеметов пзПараметрыПродукции
		 *	@type:	public
		 *	@topic: 0
		 */
		_mgr.istr_by_obj = function(oNom, row){
			var cClr = row ? row.clr : oNom.clr,
				oClr = $p.is_empty_guid(cClr) ? {id: 0} : $p.cat["clrs"].get(cClr),
				elm_type = row ? $p.enm["elm_types"].get(row.elm_type).name : $p.enm["elm_types"].get(oNom.elm_type).name,
				by_default = row ? (row["by_default"] ? 1 : "") : "",
				pos = row ? $p.enm["positions"].get(row.pos).name : "";

			return oNom.id + ";" +
				elm_type + ";" +
				by_default + ";" +
				pos + ";" +
				oNom.article + ";" +
				oClr.id + ";" +
				oNom.width + ";" +
				oNom.sizeb + ";" +
				oNom.sizefurn + ";" +
				oNom.thickness
		};

		/**
		 *	@desc: 	формирует номенклатуры для построителя и конструирует $p.N
		 *	@param: 	osys	- справочникОбъект пзПараметрыПродукции
		 *	@param: 	o		- справочникОбъект ХарактеристикиНоменлктауры
		 *	@type:	public
		 *	@topic: 0
		 */
		_mgr.make_istr = function(osys, o, sys_changed){
			var iStr = "", oNom, aIds = {};
			osys.elmnts._obj.forEach(function(row){
				if(iStr)
					iStr = iStr + "¶";
				oNom = _mgr.get(row.nom, false);
				iStr = iStr + _mgr.istr_by_obj(oNom._obj, row);
				aIds[oNom.id] = "";
			});
			o["coordinates"]._obj.forEach(function(row){
				if(!$p.is_empty_guid(row.nom)){
					oNom = _mgr.get(row.nom, false);
					if(oNom.id && !sys_changed && !(oNom.id in aIds)){
						iStr = iStr + "¶" + _mgr.istr_by_obj(oNom._obj);
						aIds[oNom.id] = "";
					}
				}
			});
			$p.N = new $p.ex.RNom(iStr);
		}

	}
);
/**
 * Дополнительные методы справочника Контрагенты
 *
 * Created 23.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module cat_partners
 */

$p.modifiers.push(
	function($p){

		var _mgr = $p.cat.partners;

		_mgr.sql_selection_where_flds = function(filter){
			return " OR inn LIKE '" + filter + "' OR name_full LIKE '" + filter + "' OR name LIKE '" + filter + "'";
		};

	}
);
/**
 * Дополнительные методы справочника Системы (Параметры продукции)
 *
 * Created 23.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module cat_production_params
 */

$p.modifiers.push(
	function($p) {

		var _mgr = $p.cat.production_params;

		/**
		 * возвращает доступные в данной системе элементы
		 * @property noms
		 * @for Production_params
		 */
		_mgr._obj_сonstructor.prototype.__define("noms", {
			get: function(){
				var __noms = [];
				this.elmnts._obj.forEach(function(row){
					if(!$p.is_empty_guid(row.nom) && __noms.indexOf(row.nom) == -1)
						__noms.push(row.nom);
				});
				return __noms;
			},
			enumerable: false
		});

		/**
		 * возвращает доступные в данной системе элементы
		 * @property inserts
		 * @for Production_params
		 */
		_mgr._obj_сonstructor.prototype.__define("inserts", {
			value: function(elm_types){
				var __noms = [];
				if(typeof elm_types == "string")
					elm_types = $p.enm.elm_types[elm_types];

				this.elmnts.each(function(row){
					if(!row.nom.empty() && __noms.indexOf(row.nom) == -1 && elm_types.indexOf(row.elm_type) != -1)
						__noms.push(row.nom);
				});
				return __noms;
			},
			enumerable: false
		});

		/**
		 * возвращает массив доступных для данного свойства значений
		 * @param prop {CatObj} - планвидовхарактеристик ссылка или объект
		 * @param is_furn {boolean} - интересуют свойства фурнитуры или объекта
		 * @return {Array}
		 */
		_mgr.slist = function(prop, is_furn){
			var res = [], rt, at, pmgr,
				op = this.get(prop);
			if(is_furn && $p.wsql.get_user_param("furn_params_restricted")){
				// за параметрами топаем в 1С

			}else if(op && op.type.is_ref){
				// параметры получаем из локального кеша
				for(rt in op.type.types)
					if(op.type.types[rt].indexOf(".") > -1){
						at = op.type.types[rt].split(".");
						pmgr = $p[at[0]][at[1]];
						if(pmgr){
							if(pmgr.class_name=="enm.open_directions")
								pmgr.each(function(v){
									if(v.name!=$p.enm.tso.folding)
										res.push({value: v.ref, text: v.synonym});
								});
							else
								pmgr.find_rows({owner: prop}, function(v){
									res.push({value: v.ref, text: v.presentation});
								});
						}
					}
			}
			return res;
		};



	}
);

/**
 * Дополнительные методы плана видов характеристик Свойства объектов
 *
 * Created 23.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module cch_properties
 */

$p.modifiers.push(
	function($p) {

		var _mgr = $p.cch.properties;

		/**
		 * Проверяем заполненность обязательных полей
		 * @param prms {Array}
		 * @param title {String}
		 * @return {boolean}
		 */
		_mgr.check_mandatory = function(prms, title){

			var t, row;

			// проверяем заполненность полей
			for(t in prms){
				row = prms[t];
				if(row.param.mandatory && (!row.value || row.value.empty())){
					$p.msg.show_msg({
						type: "alert-error",
						text: $p.msg.bld_empty_param + row.param.presentation,
						title: title || $p.msg.bld_title});
					return true;
				}
			}

		};

		/**
		 * Возвращает массив доступных для данного свойства значений
		 * @param prop {CatObj} - планвидовхарактеристик ссылка или объект
		 * @param ret_mgr {Object} - установить в этом объекте указатель на менеджера объекта
		 * @return {Array}
		 */
		_mgr.slist = function(prop, ret_mgr){

			var res = [], rt, at, pmgr, op = this.get(prop);

			if(op && op.type.is_ref){
				// параметры получаем из локального кеша
				for(rt in op.type.types)
					if(op.type.types[rt].indexOf(".") > -1){
						at = op.type.types[rt].split(".");
						pmgr = $p[at[0]][at[1]];
						if(pmgr){

							if(ret_mgr)
								ret_mgr.mgr = pmgr;

							if(pmgr.class_name=="enm.open_directions")
								pmgr.get_option_list().forEach(function(v){
									if(v.value && v.value!=$p.enm.tso.folding)
										res.push(v);
								});

							else if(pmgr.class_name.indexOf("enm.")!=-1 || !pmgr.metadata().has_owners)
								res = pmgr.get_option_list();

							else
								pmgr.find_rows({owner: prop}, function(v){
									res.push({value: v.ref, text: v.presentation});
								});

						}
					}
			}
			return res;
		};

	}
);

/**
 * форма документа Расчет-заказ. публикуемый метод: doc.calc_order.form_obj(o, pwnd, attr)
 */


$p.modifiers.push(

	function($p) {

		var _mngr = $p.doc.calc_order;

		/**
		 * структура заголовков табчасти продукции
		 * @param source
		 */
		(function(source){

			if($p.wsql.get_user_param("hide_price_dealer")){
				source.headers = "№,Номенклатура,Характеристика,Комментарий,Штук,Длина,Высота,Площадь,Колич.,Ед,Скидка,Цена,Сумма,Скидка дилера,Цена дилера,Сумма дилера";
				source.widths = "40,200,*,220,0,70,70,70,70,40,70,70,70,0,0,0";
				source.min_widths = "30,200,220,150,0,70,40,70,70,70,70,70,70,0,0,0";

			}else if($p.wsql.get_user_param("hide_price_manufacturer")){
				source.headers = "№,Номенклатура,Характеристика,Комментарий,Штук,Длина,Высота,Площадь,Колич.,Ед,Скидка постав.,Цена постав.,Сумма постав.,Скидка,Цена,Сумма";
				source.widths = "40,200,*,220,0,70,70,70,70,40,0,0,0,70,70,70";
				source.min_widths = "30,200,220,150,0,70,40,70,70,70,0,0,0,70,70,70";

			}else{
				source.headers = "№,Номенклатура,Характеристика,Комментарий,Штук,Длина,Высота,Площадь,Колич.,Ед,Скидка постав.,Цена постав.,Сумма постав.,Скидка,Цена,Сумма";
				source.widths = "40,200,*,220,0,70,70,70,70,40,70,70,70,70,70,70";
				source.min_widths = "30,200,220,150,0,70,40,70,70,70,70,70,70,70,70,70";
			}

			if($p.ajax.root)
				source.types = "cntr,ref,ref,txt,calck,calck,calck,calck,calck,ref,calck,ro,ro,calck,calck,ro";
			else
				source.types = "cntr,ref,ref,txt,calck,calck,calck,calck,calck,ref,ro,ro,ro,calck,calck,ro";

		})($p.doc.calc_order.metadata().form.obj.tabular_sections.production);

		_mngr.form_obj = function(pwnd, attr){

			var o, wnd;

			attr.draw_tabular_sections = function (o, wnd, tabular_init) {

				/**
				 *	статусбар с картинками
				 */
				wnd.elmnts.statusbar = wnd.attachStatusBar({text: "<div></div>"});
				wnd.elmnts.svgs = new $p.iface.OSvgs($p.doc.calc_order, wnd, wnd.elmnts.statusbar);
				wnd.elmnts.svgs.reload(o.ref);

				/**
				 * табчасть продукции
				 */
				tabular_init("production", $p.injected_data["toolbar_calc_order_production.xml"]);

				var toolbar = wnd.elmnts.tabs.tab_production.getAttachedToolbar();
				toolbar.addSpacer("btn_delete");
				toolbar.attachEvent("onclick", toolbar_click);

				// попап для присоединенных файлов
				wnd.elmnts.discount_pop = new dhtmlXPopup({
					toolbar: toolbar,
					id: "btn_discount"
				});
				wnd.elmnts.discount_pop.attachEvent("onShow", show_discount);

			};

			attr.draw_pg_header = function (o, wnd) {

				/**
				 *	закладка шапка
				 */
				wnd.elmnts.layout_header = wnd.elmnts.tabs.tab_header.attachLayout('3U');

				/**
				 *	левая колонка шапки документа
				 */
				wnd.elmnts.cell_left = wnd.elmnts.layout_header.cells('a');
				wnd.elmnts.cell_left.hideHeader();
				wnd.elmnts.pg_left = wnd.elmnts.cell_left.attachHeadFields({
					obj: o,
					pwnd: wnd,
					read_only: !$p.ajax.root,
					oxml: {
						" ": [{id: "number_doc", path: "o.number_doc", synonym: "Номер", type: "ro", txt: o.number_doc},
							{id: "date", path: "o.date", synonym: "Дата", type: "ro", txt: $p.dateFormat(o.date, "")},
							"number_internal"
							],
						"Контактная информация": ["partner", "client_of_dealer", "phone",
							{id: "shipping_address", path: "o.shipping_address", synonym: "Адрес доставки", type: "addr", txt: o["shipping_address"]}
						],
						"Дополнительные реквизиты": ["invoice_state",
							{id: "obj_delivery_state", path: "o.obj_delivery_state", synonym: "Состояние транспорта", type: "ro", txt: o["obj_delivery_state"].presentation}
						]
					}
				});

				/**
				 *	правая колонка шапки документа
				 * TODO: задействовать либо удалить choice_links
				 * var choice_links = {contract: [
				 * {name: ["selection", "owner"], path: ["partner"]},
				 * {name: ["selection", "organization"], path: ["organization"]}
				 * ]};
				 */

				wnd.elmnts.cell_right = wnd.elmnts.layout_header.cells('b');
				wnd.elmnts.cell_right.hideHeader();
				wnd.elmnts.pg_right = wnd.elmnts.cell_right.attachHeadFields({
					obj: o,
					pwnd: wnd,
					read_only: !$p.ajax.root,
					oxml: {
						"Налоги": ["vat_consider", "vat_included"],
						"Аналитика": ["project",
							{id: "organization", path: "o.organization", synonym: "Организация", type: "refc", txt: o["organization"].presentation},
							"contract", "organizational_unit", "department"],
						"Итоги": [{id: "doc_currency", path: "o.doc_currency", synonym: "Валюта документа", type: "ro", txt: o["doc_currency"].presentation},
							{id: "doc_amount", path: "o.doc_amount", synonym: "Сумма", type: "ron", txt: o["doc_amount"]},
							{id: "amount_internal", path: "o.amount_internal", synonym: "Сумма внутр", type: "ron", txt: o["amount_internal"]}]
					}
				});

				/**
				 *	редактор комментариев
				 */
				wnd.elmnts.cell_note = wnd.elmnts.layout_header.cells('c');
				wnd.elmnts.cell_note.hideHeader();
				wnd.elmnts.cell_note.setHeight(140);
				wnd.elmnts.note_editor = wnd.elmnts.cell_note.attachEditor();
				wnd.elmnts.note_editor.setContent(o.note);
				wnd.elmnts.note_editor.attachEvent("onAccess", function(name, ev){
					if(wnd.elmnts.ro)
						return false;
					if (name == "blur")
						o.note = this.getContent();
				});

				//wnd.elmnts.pg_header = wnd.elmnts.tabs.tab_header.attachHeadFields({
				//	obj: o,
				//	pwnd: wnd,
				//	read_only: !$p.ajax.root    // TODO: учитывать права для каждой роли на каждый объект
				//});
			};

			attr.toolbar_struct = $p.injected_data["toolbar_calc_order_obj.xml"];

			return this.constructor.prototype.form_obj.call(this, pwnd, attr)
				.then(function (res) {

					o = res.o;
					wnd = res.wnd;

					// в зависимости от статуса
					setTimeout(set_editable, 50);

					return res;
				});



			/**
			 * обработчик нажатия кнопок командных панелей
			 */
			function toolbar_click(btn_id){

				switch(btn_id) {

					case 'btn_sent':
						save("sent");
						break;

					case 'btn_save':
						save("save");
						break;

					case 'btn_retrieve':
						save("retrieve");
						break;

					case 'btn_add_builder':
						open_builder(true);
						break;

					case 'btn_add_product':
						$p.injected_data["wnd/wnd_product_list"](o, wnd, process_add_product);
						break;

					case 'btn_add_material':
						add_material();
						break;

					case 'btn_edit':
						open_builder();
						break;

					case 'btn_discount':

						break;

					case 'btn_calendar':
						caltndar_new_event();
						break;

					case 'btn_go_connection':
						go_connection();
						break;

				}
			}

			/**
			 * создаёт событие календаря
			 */
			function caltndar_new_event(){
				$p.msg.show_not_implemented();
			}

			/**
			 * показывает список связанных документов
			 */
			function go_connection(){
				$p.msg.show_not_implemented();
			}

			/**
			 * создаёт и показывает диалог групповых скидок
			 */
			function show_discount(){
				if (!wnd.elmnts.discount) {

					wnd.elmnts.discount = wnd.elmnts.discount_pop.attachForm([
						{type: "fieldset",  name: "discounts", label: "Скидки по группам", width:220, list:[
							{type:"settings", position:"label-left", labelWidth:100, inputWidth:50},
							{type:"input", label:"На продукцию", name:"production", numberFormat:["0.0 %", "", "."]},
							{type:"input", label:"На аксессуары", name:"accessories", numberFormat:["0.0 %", "", "."]},
							{type:"input", label:"На услуги", name:"services", numberFormat:["0.0 %", "", "."]}
						]},
						{ type:"button" , name:"btn_discounts", value:"Ок", tooltip:"Установить скидки"  }
					]);
					wnd.elmnts.discount.setItemValue("production", 0);
					wnd.elmnts.discount.setItemValue("accessories", 0);
					wnd.elmnts.discount.setItemValue("services", 0);
					wnd.elmnts.discount.attachEvent("onButtonClick", function(name){
						wnd.progressOn();
						_mngr.save({
							ref: o.ref,
							discounts: {
								production: $p.fix_number(wnd.elmnts.discount.getItemValue("production"), true),
								accessories: $p.fix_number(wnd.elmnts.discount.getItemValue("accessories"), true),
								services: $p.fix_number(wnd.elmnts.discount.getItemValue("services"), true)
							},
							o: o._obj,
							action: "calc",
							specify: "discounts"
						}).then(function(res){
							if(!$p.msg.check_soap_result(res))
								wnd.reflect_characteristic_change(res); // - перезаполнить шапку и табчасть
							wnd.progressOff();
							wnd.elmnts.discount_pop.hide();
						});
					});
				}
			}


			/**
			 * обработчик выбора значения в таблице продукции (ссылочные типы)
			 */
			function production_on_value_select(v){
				this.row[this.col] = v;
				this.cell.setValue(v.presentation);
				production_on_value_change();
			}

			/**
			 * РассчитатьСпецификациюСтроки() + ПродукцияПриОкончанииРедактирования()
			 * при изменении строки табчасти продукции
			 */
			function production_on_value_change(rId){

				wnd.progressOn();
				_mngr.save({
					ref: o.ref,
					row: rId!=undefined ? rId : production_get_sel_index(),
					o: o._obj,
					action: "calc",
					specify: "production"
				}).then(function(res){
					if(!$p.msg.check_soap_result(res))
						wnd.reflect_characteristic_change(res); // - перезаполнить шапку и табчасть
					wnd.progressOff();
				});
			}

			/**
			 * Перечитать табчасть продукции из объекта
			 */
			function production_refresh(){
				o["production"].sync_grid(wnd.elmnts.grids.production);
			}

			/**
			 * обработчик активизации строки продукции
			 */
			function production_on_row_activate(rId, cInd){
				var row = o["production"].get(rId-1),
					sfields = this.getUserData("", "source").fields,
					rofields = "nom,characteristic,qty,len,width,s,quantity,unit",
					pval;


				if($p.is_data_obj(row.ordn) && !row.ordn.empty()){
					for(var i in sfields)
						if(rofields.indexOf(sfields[i])!=-1){
							pval = this.cells(rId, Number(i)).getValue();
							this.setCellExcellType(rId, Number(i), "ro");
							if($p.is_data_obj(pval))
								this.cells(rId, Number(i)).setValue(pval.presentation);
						}
				}
			}

			/**
			 * обработчик изменения значения в таблице продукции (примитивные типы)
			 */
			function production_on_edit(stage, rId, cInd, nValue, oValue){
				if(stage != 2 || nValue == oValue) return true;
				var fName = this.getUserData("", "source").fields[cInd], ret_code;
				if(fName == "note"){
					ret_code = true;
					o["production"].get(rId-1)[fName] = nValue;
				} else if (!isNaN(Number(nValue))){
					ret_code = true;
					o["production"].get(rId-1)[fName] = Number(nValue);
				}
				if(ret_code){
					setTimeout(function(){ production_on_value_change(rId-1); } , 0);
					return ret_code;
				}
			}


			/**
			 * вспомогательные функции
			 */


			/**
			 * настройка (инициализация) табличной части продукции
			 */
			function production_init(){


				// собственно табличная часть
				var grid = wnd.elmnts.grids.production,
					source = {
						o: o,
						wnd: wnd,
						on_select: production_on_value_select,
						tabular_section: "production",
						footer_style: "text-align: right; font: bold 12px Tahoma; color: #005; background: #f9f9f9; height: 22px;"
					};
				production_captions(source);

				grid.setIconsPath(dhtmlx.image_path);
				grid.setImagePath(dhtmlx.image_path);

				// 16 полей
				//row, nom, characteristic, note, qty, len, width, s, quantity, unit, discount_percent, price, amount, discount_percent_internal, price_internal, amount_internal
				grid.setHeader(source.headers);
				grid.setInitWidths(source.widths);
				grid.setColumnMinWidth(source.min_widths);

				grid.setColumnIds(source.fields.join(","));
				grid.enableAutoWidth(true, 1200, 600);
				grid.enableEditTabOnly(true);

				grid.init();
				//grid.enableLightMouseNavigation(true);
				//grid.enableKeyboardSupport(true);
				//grid.splitAt(2);

				grid.attachFooter("Итого:,#cspan,#cspan,#cspan,#cspan,#cspan,#cspan,#cspan,#cspan,#cspan,#cspan,#cspan,{#stat_total}, ,#cspan,{#stat_total}",
					[source.footer_style, "","","","","","","","","","","",source.footer_style,source.footer_style,"",source.footer_style]);

				grid.setUserData("", "source", source);
				grid.attachEvent("onEditCell", production_on_edit);
				grid.attachEvent("onRowSelect", production_on_row_activate);
			}


			/**
			 * перечитывает реквизиты шапки из объекта в гриды
			 */
			function header_refresh(){
				function reflect(id){
					if(typeof id == "string"){
						var fv = o[id]
						if(fv != undefined){
							if($p.is_data_obj(fv))
								this.cells(id, 1).setValue(fv.presentation);
							else if(fv instanceof Date)
								this.cells(id, 1).setValue($p.dateFormat(fv, ""));
							else
								this.cells(id, 1).setValue(fv);

						}else if(id.indexOf("extra_fields") > -1){
							var row = o["extra_fields"].find(id.split("|")[1]);
						}
					}
				}
				wnd.elmnts.pg_left.forEachRow(function(id){	reflect.call(wnd.elmnts.pg_left, id); });
				wnd.elmnts.pg_right.forEachRow(function(id){ reflect.call(wnd.elmnts.pg_right, id); });
			}

			function production_new_row(){
				var row = o["production"].add({
					qty: 1,
					quantity: 1,
					discount_percent_internal: $p.wsql.get_user_param("discount", "number")
				});
				production_refresh();
				wnd.elmnts.grids.production.selectRowById(row.row);
				return row;
			}

			function production_get_sel_index(){
				var selId = wnd.elmnts.grids.production.getSelectedRowId();
				if(selId && !isNaN(Number(selId)))
					return Number(selId)-1;
				$p.msg.show_msg({type: "alert-warning",
					text: $p.msg.no_selected_row.replace("%1", "Продукция"),
					title: _mngr.metadata()["obj_presentation"] + ' №' + o.number_str});
			}

			function production_del_row(){

				var rId = production_get_sel_index(), row;

				if(rId == undefined)
					return;
				else
					row = o["production"].get(rId);

				// проверяем, не подчинена ли текущая строка продукции
				if($p.is_data_obj(row.ordn) && !row.ordn.empty()){
					// возможно, ссылка оборвана. в этом случае, удаление надо разрешить
					if(o["production"].find({characteristic: row.ordn})){
						$p.msg.show_msg({type: "alert-warning",
							text: $p.msg.sub_row_change_disabled,
							title: o.presentation + ' стр. №' + (rId + 1)});
						return;
					}
				}

				// если удаляем строку продукции, за одно надо удалить и подчиненные аксессуары
				if($p.is_data_obj(row.characteristic) && !row.characteristic.empty()){
					o["production"].find_rows({ordn: row.characteristic}).forEach(function (r) {
						o["production"].del(r);
					});
				}

				wnd.progressOn();
				_mngr.save({
					ref: o.ref,
					del_row: rId,
					o: o._obj,
					action: "calc",
					specify: "production"
				}).then(function(res){
					if(!$p.msg.check_soap_result(res))			// сервер об ошибках не сообщил. считаем, что данные записались
						wnd.reflect_characteristic_change(res); // - перезаполнить шапку и табчасть
					wnd.progressOff();
				});
			}

			function save(action){

				function do_save(){

					wnd.progressOn();
					o.note = wnd.elmnts.note_editor.getContent();
					_mngr.save({
						ref: o.ref,
						o: o._obj,
						action: "calc"
					}).then(function(res){
						if(!$p.msg.check_soap_result(res)) {
							o._mixin(res.calc_order);
							production_refresh();
							header_refresh();
							set_editable();
							setTimeout(function(){
								$p.iface.grid_calc_order.reload(undefined, true);
							}, 200);
						}
						wnd.progressOff();
					});
				}

				if(action == "sent"){
					// показать диалог и обработать возврат
					dhtmlx.confirm({
						title: $p.msg.order_sent_title,
						text: $p.msg.order_sent_message,
						cancel: "Отмена",
						callback: function(btn) {
							if(btn){
								// установить транспорт в "отправлено" и записать
								o["obj_delivery_state"] = $p.enm.obj_delivery_states.Отправлен;
								do_save();
							}
						}
					});

				} else if(action == "retrieve"){
					// установить транспорт в "отозвано" и записать
					o["obj_delivery_state"] =  $p.enm.obj_delivery_states.Отозван;
					do_save();

				} else if(action == "save"){
					do_save();
				}
			}

			function frm_close(win){

				// выгружаем из памяти всплывающие окна скидки и связанных файлов
				["vault", "vault_pop", "discount", "discount_pop"].forEach(function (elm) {
					if (wnd.elmnts[elm])
						wnd.elmnts[elm].unload();
				});



				return true;
			}

			function set_editable(){

				// статусы
				var ds = $p.enm["obj_delivery_states"],
					st_draft = ds.Черновик.ref,
					st_sent = ds.Отправлен.ref,
					st_retrieve = ds.Отозван.ref,
					st_rejected = ds.Отклонен.ref,
					retrieve_enabed,
					detales_toolbar = wnd.elmnts.tabs.tab_production.getAttachedToolbar();

				wnd.elmnts.pg_right.cells("vat_consider", 1).setDisabled(true);
				wnd.elmnts.pg_right.cells("vat_included", 1).setDisabled(true);

				wnd.elmnts.ro = o["posted"] || o["deleted"];
				if(!wnd.elmnts.ro && !o["obj_delivery_state"].empty())
					wnd.elmnts.ro = !($p.is_equal(o["obj_delivery_state"], st_draft) || $p.is_equal(o["obj_delivery_state"], st_retrieve));

				retrieve_enabed = !o["deleted"] &&
					($p.is_equal(o["obj_delivery_state"], st_sent) || $p.is_equal(o["obj_delivery_state"], st_rejected));

				wnd.elmnts.grids.production.setEditable(!wnd.elmnts.ro);
				wnd.elmnts.pg_left.setEditable(!wnd.elmnts.ro);
				wnd.elmnts.pg_right.setEditable(!wnd.elmnts.ro);

				// кнопки проведения гасим всегда
				wnd.elmnts.frm_toolbar.hideItem("btn_post");
				wnd.elmnts.frm_toolbar.hideItem("btn_unpost");

				// кнопки записи и отправки гасим в зависимости от статуса
				if(wnd.elmnts.ro){
					wnd.elmnts.frm_toolbar.disableItem("btn_sent");
					wnd.elmnts.frm_toolbar.disableItem("btn_save");
					detales_toolbar.forEachItem(function(itemId){
						detales_toolbar.disableItem(itemId);
					});
				}else{
					wnd.elmnts.frm_toolbar.enableItem("btn_sent");
					wnd.elmnts.frm_toolbar.enableItem("btn_save");
					detales_toolbar.forEachItem(function(itemId){
						detales_toolbar.enableItem(itemId);
					});
				}
				if(retrieve_enabed)
					wnd.elmnts.frm_toolbar.enableListOption("bs_more", "btn_retrieve");
				else
					wnd.elmnts.frm_toolbar.disableListOption("bs_more", "btn_retrieve");
			}

			/**
			 * ОткрытьПостроитель()
			 * @param create_new {Boolean} - создавать новое изделие или открывать в текущей строке
			 */
			function open_builder(create_new){
				var selId, row, attr;

				if(create_new){
					row = production_new_row();
					// объект продукции создаём, но из 1С не читаем и пока не записываем
					$p.cat.characteristics.create({
						ref: $p.generate_guid(),
						calc_order: o,
						product: row.row
					}, true)
						.then(function (ox) {
							row.characteristic = ox;
							$p.iface.set_hash("cat.characteristics", row.characteristic.ref, "builder");
						});

				}else if((selId = production_get_sel_index()) != undefined){
					row = o.production.get(selId);
					if(row && !$p.is_empty_guid(row.characteristic.ref))
						$p.iface.set_hash("cat.characteristics", row.characteristic.ref, "builder");
				}
			}

			/**
			 * добавляет строку материала
			 */
			function add_material(){
				var row = production_new_row(),
					grid = wnd.elmnts.grids.production,
					cell;
				grid.selectCell(row.row-1, grid.getColIndexById("nom"), false, true, true);
				cell = grid.cells();
				cell.edit();
				cell.open_selection();
			}

			/**
			 * ОбработатьДобавитьПродукцию()
			 */
			function process_add_product(new_rows){

				wnd.progressOn();
				_mngr.save({
					ref: o.ref,
					row: 0,
					o: o._obj,
					action: "calc",
					specify: "product_list",
					new_rows: new_rows
				}).then(function(res){
					if(!$p.msg.check_soap_result(res))
						wnd.reflect_characteristic_change(res);
					wnd.progressOff();
				});
			}

		}

	}
);

/**
 * Дополнительные методы перечисления Типы соединений
 *
 * Created 23.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module enm_cnn_types
 */

$p.modifiers.push(
	function($p){

		var _mgr = $p.enm.cnn_types;

		/**
		 * Массивы Типов соединений
		 * @type {Object}
		 */
		_mgr.acn = {cache :{}};
		_mgr.acn.__define({

			ii: {
				get : function(){
					return this.cache.ii
						|| ( this.cache.ii = [_mgr.Наложение] );
				},
				enumerable : false,
				configurable : false
			},

			i: {
				get : function(){
					return this.cache.i
						|| ( this.cache.i = [_mgr.НезамкнутыйКонтур] );
				},
				enumerable : false,
				configurable : false
			},

			a: {
				get : function(){
					return this.cache.a
						|| ( this.cache.a = [
							_mgr.УгловоеДиагональное,
							_mgr.УгловоеКВертикальной,
							_mgr.УгловоеКГоризонтальной,
							_mgr.КрестВСтык] );
				},
				enumerable : false,
				configurable : false
			},

			t: {
				get : function(){
					return this.cache.t
						|| ( this.cache.t = [_mgr.ТОбразное] );
				},
				enumerable : false,
				configurable : false
			}
		});

		/**
		 * Короткие псевдонимы перечисления "Типы соединений"
		 * @type {Object}
		 */
		_mgr.tcn = {cache :{}};
		_mgr.tcn.__define({
			ad: {
				get : function(){
					return this.cache.ad || ( this.cache.ad = _mgr.УгловоеДиагональное );
				},
				enumerable : false,
				configurable : false
			},

			av: {
				get : function(){
					return this.cache.av || ( this.cache.av = _mgr.УгловоеКВертикальной );
				},
				enumerable : false,
				configurable : false
			},

			ah: {
				get : function(){
					return this.cache.ah || ( this.cache.ah = _mgr.УгловоеКГоризонтальной );
				},
				enumerable : false,
				configurable : false
			},

			t: {
				get : function(){
					return this.cache.t || ( this.cache.t = _mgr.ТОбразное );
				},
				enumerable : false,
				configurable : false
			},

			ii: {
				get : function(){
					return this.cache.ii || ( this.cache.ii = _mgr.Наложение );
				},
				enumerable : false,
				configurable : false
			},

			i: {
				get : function(){
					return this.cache.i || ( this.cache.i = _mgr.НезамкнутыйКонтур );
				},
				enumerable : false,
				configurable : false
			},

			xt: {
				get : function(){
					return this.cache.xt || ( this.cache.xt = _mgr.КрестПересечение );
				},
				enumerable : false,
				configurable : false
			},

			xx: {
				get : function(){
					return this.cache.xx || ( this.cache.xx = _mgr.КрестВСтык );
				},
				enumerable : false,
				configurable : false
			}
		});

	}
);
/**
 * Дополнительные методы перечисления Типы элементов
 *
 * Created 23.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module enm_elm_types
 */

$p.modifiers.push(
	function($p){

		var _mgr = $p.enm.elm_types,

			/**
			 * Массивы Типов элементов
			 * @type {Object}
			 */
			cache = {};

		_mgr.__define({

			profiles: {
				get : function(){
					return cache.profiles
						|| ( cache.profiles = [
							_mgr.Рама,
							_mgr.Створка,
							_mgr.Импост,
							_mgr.Штульп,
							_mgr.Раскладка] );
				},
				enumerable : false,
				configurable : false
			},

			rama_impost: {
				get : function(){
					return cache.rama_impost
						|| ( cache.rama_impost = [
							_mgr.Рама,
							_mgr.Импост] );
				},
				enumerable : false,
				configurable : false
			},

			stvs: {
				get : function(){
					return cache.stvs
						|| ( cache.stvs = [
							_mgr.Створка] );
				},
				enumerable : false,
				configurable : false
			},

			glasses: {
				get : function(){
					return cache.glasses
						|| ( cache.glasses = [
							_mgr.Стекло,
							_mgr.Заполнение] );
				},
				enumerable : false,
				configurable : false
			}

		});

	}
);
/**
 * Аналог УПзП-шного __ЦенообразованиеСервер__
 *
 * Created 26.05.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author	Evgeniy Malyarov
 * @module  glob_pricing
 */

$p.modifiers.push(
	function($p){

		$p.pricing = new Pricing($p);


		function Pricing($p){

			/**
			 * Возвращает цену номенклатуры по типу цен из регистра пзМаржинальныеКоэффициентыИСкидки
			 * Аналог УПзП-шного __ПолучитьЦенуНоменклатуры__
			 * @method nom_price
			 * @param nom
			 * @param characteristic
			 * @param price_type
			 * @param prm
			 * @param row
			 * @param cache
			 */
			this.nom_price = function (nom, characteristic, price_type, prm, row, cache) {

			};

			/**
			 * Возвращает структуру типов цен и КМарж
			 * Аналог УПзП-шного __ПолучитьТипЦенНоменклатуры__
			 * @method price_type
			 * @param prm
			 */
			this.price_type = function (prm) {

			};

			/**
			 * Формирует кеш цен номенклатуры по типу на дату
			 * Аналог УПзП-шного __СформироватьКешЦен__
			 * @param anom
			 * @param price_type
			 * @param date
			 * @param cache
			 */
			this.build_cache = function (anom, price_type, date, cache) {

			};

			/**
			 * Рассчитывает плановую себестоимость строки документа Расчет
			 * Аналог УПзП-шного __РассчитатьПлановуюСебестоимость__
			 * @param prm
			 * @param cancel
			 */
			this.calc_first_cost = function (prm, cancel) {

			};

			/**
			 * Рассчитывает стоимость продажи в строке документа Расчет
			 * Аналог УПзП-шного __РассчитатьСтоимостьПродажи__
			 * @param prm
			 * @param cancel
			 */
			this.calc_amount = function (prm, cancel) {

			}
		}

	}
);

/**
 * Аналог УПзП-шного __ПостроительИзделийСервер__
 *
 * Created 26.05.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author	Evgeniy Malyarov
 *
 * @module  glob_products_building
 */

$p.modifiers.push(
	function($p){

		$p.products_building = new ProductsBuilding($p);

		function ProductsBuilding($p){

			/**
			 * Перед записью изделия построителя
			 * Аналог УПзП-шного __ПередЗаписьюНаСервере__
			 * @method before_save
			 * @for ProductsBuilding
			 * @param o
			 * @param row
			 * @param prm
			 * @param cancel
			 */
			this.before_save = function (o, row, prm, cancel) {

			}

		}

	}
);


/**
 * Аналог УПзП-шного __ФормированиеСпецификацийСервер__
 *
 * Created 26.05.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author	Evgeniy Malyarov
 *
 * @module  glob_spec_building
 */

$p.modifiers.push(
	function($p){

		$p.spec_building = new SpecBuilding($p);

		function SpecBuilding($p){

			/**
			 * Рассчитывает спецификацию в строке документа Расчет
			 * Аналог УПзП-шного __РассчитатьСпецификациюСтроки__
			 * @param prm
			 * @param cancel
			 */
			this.calc_row_spec = function (prm, cancel) {

			}

		}

	}
);



$p.injected_data._mixin({"create_tables.sql":"USE md;\nCREATE TABLE IF NOT EXISTS `cch_properties` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `caption` CHAR, `destination` CHAR, `ЭтоДополнительноеСведение` BOOLEAN, `mandatory` BOOLEAN, `МногострочноеПолеВвода` INT, `ДополнительныеЗначенияИспользуются` BOOLEAN, `ВладелецДополнительныхЗначений` CHAR, `ДополнительныеЗначенияСВесом` BOOLEAN, `ЗаголовокФормыЗначения` CHAR, `ЗаголовокФормыВыбораЗначения` CHAR, `ФорматСвойства` CHAR, `note` CHAR, `tooltip` CHAR, `УдалитьСклоненияПредмета` CHAR);\nCREATE TABLE IF NOT EXISTS `enm_outline_formation` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_elm_types` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_cnn_types` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_sz_line_types` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_open_types` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_cutting_optimization_types` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_lay_split_types` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_inserts_glass_types` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_inserts_types` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_bases_types` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_cnn_sides` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_specification_installation_methods` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_angle_calculating_ways` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_count_calculating_ways` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_simple_complex_all` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_positions` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_orientations` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_plan_limit` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_specification_adjustment_areas` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_open_directions` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_color_groups_destination` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_control_during` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_planning_detailing` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_text_aligns` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_contraction_options` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_offset_options` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_transfer_operations_options` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_impost_mount_options` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_inset_attrs_options` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_gender` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_individual_legal` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_contract_kinds` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_mutual_contract_settlements` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_obj_delivery_states` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_contact_information_types` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_nom_types` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_costs_character` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_costs_material_feeds` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_costs_kinds` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `enm_vat_rates` (ref CHAR PRIMARY KEY NOT NULL, sequence INT, synonym CHAR);\nCREATE TABLE IF NOT EXISTS `doc_calc_order` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, posted boolean, date Date, number_doc CHAR, `number_internal` CHAR, `project` CHAR, `organization` CHAR, `partner` CHAR, `client_of_dealer` CHAR, `contract` CHAR, `invoice` CHAR, `organizational_unit` CHAR, `note` CHAR, `manager` CHAR, `leading_manager` CHAR, `department` CHAR, `doc_amount` FLOAT, `amount_operation` FLOAT, `amount_internal` FLOAT, `accessory_characteristic` CHAR, `doc_currency` CHAR, `sys_profile` CHAR, `sys_furn` CHAR, `phone` CHAR, `delivery_area` CHAR, `shipping_address` CHAR, `coordinates` CHAR, `address_fields` CHAR, `invoice_state` CHAR, `difficult` BOOLEAN, `vat_consider` BOOLEAN, `vat_included` BOOLEAN, `settlements_course` FLOAT, `settlements_multiplicity` INT, `obj_delivery_state` CHAR, `change_time` INT, `changed_here` BOOLEAN, `ts_production` JSON, `ts_extra_fields` JSON, `ts_contact_information` JSON);\nCREATE TABLE IF NOT EXISTS `doc_workers_schedules` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, posted boolean, date Date, number_doc CHAR, `start_date` Date, `expiration_date` Date, `responsible` CHAR, `note` CHAR, `ts_workers` JSON);\nCREATE TABLE IF NOT EXISTS `doc_purchase` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, posted boolean, date Date, number_doc CHAR, `organization` CHAR, `partner` CHAR, `department` CHAR, `warehouse` CHAR, `doc_amount` FLOAT, `note` CHAR, `responsible` CHAR, `ts_goods` JSON, `ts_services` JSON);\nCREATE TABLE IF NOT EXISTS `doc_selling` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, posted boolean, date Date, number_doc CHAR, `organization` CHAR, `department` CHAR, `warehouse` CHAR, `partner` CHAR, `doc_amount` FLOAT, `note` CHAR, `responsible` CHAR, `ts_goods` JSON, `ts_services` JSON);\nCREATE TABLE IF NOT EXISTS `doc_registers_correction` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, posted boolean, date Date, number_doc CHAR, `note` CHAR, `responsible` CHAR, `original_doc_type` CHAR, `ts_registers_table` JSON);\nCREATE TABLE IF NOT EXISTS `doc_credit_bank_order` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, posted boolean, date Date, number_doc CHAR, `organization` CHAR, `partner` CHAR, `department` CHAR, `doc_amount` FLOAT, `note` CHAR, `responsible` CHAR);\nCREATE TABLE IF NOT EXISTS `doc_debit_bank_order` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, posted boolean, date Date, number_doc CHAR, `organization` CHAR, `partner` CHAR, `department` CHAR, `doc_amount` FLOAT, `note` CHAR, `responsible` CHAR);\nCREATE TABLE IF NOT EXISTS `doc_credit_cash_order` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, posted boolean, date Date, number_doc CHAR, `organization` CHAR, `partner` CHAR, `partner_T` CHAR, `department` CHAR, `cashbox` CHAR, `doc_amount` FLOAT, `note` CHAR, `responsible` CHAR);\nCREATE TABLE IF NOT EXISTS `doc_debit_cash_order` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, posted boolean, date Date, number_doc CHAR, `organization` CHAR, `partner` CHAR, `partner_T` CHAR, `department` CHAR, `cashbox` CHAR, `doc_amount` FLOAT, `note` CHAR, `responsible` CHAR);\nCREATE TABLE IF NOT EXISTS `doc_planning_event` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, posted boolean, date Date, number_doc CHAR, `phase` CHAR, `work_shift` CHAR, `department` CHAR, `work_center` CHAR, `obj` CHAR, `obj_T` CHAR, `ts_executors` JSON, `ts_planning` JSON);\nCREATE TABLE IF NOT EXISTS `doc_nom_prices_setup` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, posted boolean, date Date, number_doc CHAR, `note` CHAR, `responsible` CHAR, `change_time` INT, `ts_goods` JSON);\nCREATE TABLE IF NOT EXISTS `ireg_$log` (`date` INT, `sequence` INT, `class` CHAR, `note` CHAR, `obj` CHAR, PRIMARY KEY (`date`, `sequence`));\nCREATE TABLE IF NOT EXISTS `ireg_specification_adjustment` (`area` CHAR, `area_T` CHAR, `icounter` INT, `production` CHAR, `material_operation` CHAR, `characteristic` CHAR, `parameters_key` CHAR, `formula` CHAR, `condition_formula` CHAR, `is_order_row` BOOLEAN, PRIMARY KEY (`area`, `icounter`, `production`, `material_operation`, `characteristic`, `parameters_key`));\nCREATE TABLE IF NOT EXISTS `ireg_margin_coefficients` (`price_group` CHAR, `parameters_key` CHAR, `condition_formula` CHAR, `marginality` FLOAT, `marginality_min` FLOAT, `marginality_internal` FLOAT, `price_type_first_cost` CHAR, `price_type_sale` CHAR, `price_type_internal` CHAR, `formula` CHAR, `sale_formula` CHAR, `internal_formula` CHAR, `external_formula` CHAR, `extra_charge_external` FLOAT, `discount_external` FLOAT, `discount` FLOAT, PRIMARY KEY (`price_group`, `parameters_key`, `condition_formula`));\nCREATE TABLE IF NOT EXISTS `ireg_workers_schedules` (`begin_time` Date, `individual_person` CHAR, `department` CHAR, `end_time` Date, PRIMARY KEY (`begin_time`, `individual_person`, `department`));\nCREATE TABLE IF NOT EXISTS `ireg_integration_links_cache` (`identifier` CHAR, `conformity` CHAR, `conformity_T` CHAR, `identifier_presentation` CHAR, PRIMARY KEY (`identifier`));\nCREATE TABLE IF NOT EXISTS `ireg_nom_prices` (`price_type` CHAR, `nom` CHAR, `nom_characteristic` CHAR, `currency` CHAR, `price` FLOAT, `discount_percent` FLOAT, PRIMARY KEY (`price_type`, `nom`, `nom_characteristic`));\nCREATE TABLE IF NOT EXISTS `cat_bases` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN);\nCREATE TABLE IF NOT EXISTS `cat_color_price_groups` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `for_pricing_only` CHAR, `for_pricing_only_T` CHAR, `ts_price_groups` JSON, `ts_clr_conformity` JSON);\nCREATE TABLE IF NOT EXISTS `cat_price_groups` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `definition` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_parameters_keys` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `КоличествоПараметров` INT, `ts_params` JSON);\nCREATE TABLE IF NOT EXISTS `cat_individuals` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `birth_date` Date, `inn` CHAR, `imns_code` CHAR, `note` CHAR, `pfr_number` CHAR, `sex` CHAR, `birth_place` CHAR, `ОсновноеИзображение` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_organization_bank_accounts` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `bank` CHAR, `funds_currency` CHAR, `account_number` CHAR, `СрокИсполненияПлатежа` INT, `settlements_bank` CHAR, `department` CHAR, `owner` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_partner_bank_accounts` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `account_number` CHAR, `bank` CHAR, `settlements_bank` CHAR, `correspondent_text` CHAR, `appointments_text` CHAR, `funds_currency` CHAR, `bank_bic` CHAR, `РучноеИзменениеРеквизитовБанка` BOOLEAN, `bank_name` CHAR, `bank_correspondent_account` CHAR, `bank_city` CHAR, `bank_address` CHAR, `bank_phone_numbers` CHAR, `settlements_bank_bic` CHAR, `РучноеИзменениеРеквизитовБанкаДляРасчетов` BOOLEAN, `НаименованиеБанкаДляРасчетов` CHAR, `settlements_bank_correspondent_account` CHAR, `settlements_bank_city` CHAR, `АдресБанкаДляРасчетов` CHAR, `ТелефоныБанкаДляРасчетов` CHAR, `owner` CHAR, `owner_T` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_nom_prices_types` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `price_currency` CHAR, `discount_percent` FLOAT, `vat_price_included` BOOLEAN, `rounding_order` CHAR, `rounding_in_a_big_way` BOOLEAN, `note` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_elm_visualization` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `article` CHAR, `svg_path` CHAR, `is_handle` BOOLEAN, `offset` INT, `side` CHAR, `elm_side` BOOLEAN, `attributes` CHAR, `cx` INT, `cy` INT);\nCREATE TABLE IF NOT EXISTS `cat_params_links` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `master` CHAR, `slave` CHAR, `ts_values` JSON);\nCREATE TABLE IF NOT EXISTS `cat_predefined_elmnts` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `elm` CHAR, `elm_T` CHAR, `ts_elmnts` JSON);\nCREATE TABLE IF NOT EXISTS `cat_destinations` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `КоличествоРеквизитов` CHAR, `КоличествоСведений` CHAR, `parent` CHAR, `ts_extra_fields` JSON, `ts_extra_properties` JSON);\nCREATE TABLE IF NOT EXISTS `cat_countries` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `name_full` CHAR, `alpha2` CHAR, `alpha3` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_users` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `invalid` BOOLEAN, `note` CHAR, `ancillary` BOOLEAN, `Подготовлен` BOOLEAN, `ИдентификаторПользователяИБ` CHAR, `ИдентификаторПользователяСервиса` CHAR, `СвойстваПользователяИБ` CHAR, `ts_extra_fields` JSON, `ts_contact_information` JSON);\nCREATE TABLE IF NOT EXISTS `cat_projects` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `start` Date, `finish` Date, `launch` Date, `readiness` Date, `completed` BOOLEAN, `responsible` CHAR, `note` CHAR, `parent` CHAR, `ts_extra_fields` JSON);\nCREATE TABLE IF NOT EXISTS `cat_banks_qualifier` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `correspondent_account` CHAR, `city` CHAR, `address` CHAR, `phone_numbers` CHAR, `activity_ceased` BOOLEAN, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_units` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `name_full` CHAR, `international_short` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_currencies` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `ЗагружаетсяИзИнтернета` BOOLEAN, `name_full` CHAR, `extra_charge` FLOAT, `main_currency` CHAR, `parameters_russian_recipe` CHAR, `ФормулаРасчетаКурса` CHAR, `СпособУстановкиКурса` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_property_values` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `heft` FLOAT, `owner` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_nom_groups` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `storage_unit` CHAR, `base_unit` CHAR, `vat_rate` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_nom_units` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `qualifier_unit` CHAR, `heft` FLOAT, `volume` FLOAT, `coefficient` FLOAT, `rounding_threshold` INT, `ПредупреждатьОНецелыхМестах` BOOLEAN, `owner` CHAR, `owner_T` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_contact_information_kinds` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `АдресТолькоРоссийский` BOOLEAN, `ВключатьСтрануВПредставление` BOOLEAN, `ЗапрещатьВводНекорректного` BOOLEAN, `МожноИзменятьСпособРедактирования` BOOLEAN, `mandatory_fields` BOOLEAN, `tooltip` CHAR, `ПроверятьКорректность` BOOLEAN, `ПроверятьПоФИАС` BOOLEAN, `РазрешитьВводНесколькихЗначений` BOOLEAN, `РедактированиеТолькоВДиалоге` BOOLEAN, `РеквизитДопУпорядочивания` INT, `СкрыватьНеактуальныеАдреса` BOOLEAN, `type` CHAR, `ЗапретитьРедактированиеПользователем` BOOLEAN, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_nom_kinds` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `nom_type` CHAR, `НаборСвойствНоменклатура` CHAR, `НаборСвойствХарактеристика` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_nom` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `article` CHAR, `name_full` CHAR, `base_unit` CHAR, `storage_unit` CHAR, `nom_kind` CHAR, `cost_item` CHAR, `nom_group` CHAR, `vat_rate` CHAR, `note` CHAR, `price_group` CHAR, `parent` CHAR, `elm_type` CHAR, `len` FLOAT, `width` FLOAT, `thickness` FLOAT, `sizeb` FLOAT, `arc_elongation` FLOAT, `sizefurn` FLOAT, `is_accessory` BOOLEAN, `is_procedure` BOOLEAN, `density` FLOAT, `volume` FLOAT, `clr` CHAR, `is_service` BOOLEAN, `ts_extra_fields` JSON, `ts_nom_units` JSON);\nCREATE TABLE IF NOT EXISTS `cat_invoice_states` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `clr` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_furns` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `furn_no` INT, `flap_weight_max` INT, `left_right` BOOLEAN, `is_set` BOOLEAN, `is_sliding` BOOLEAN, `furn_set` CHAR, `side_count` INT, `handle_side` INT, `open_type` CHAR, `name_short` CHAR, `parent` CHAR, `ts_open_tunes` JSON, `ts_specification` JSON, `ts_selection_params` JSON, `ts_specification_restrictions` JSON);\nCREATE TABLE IF NOT EXISTS `cat_inserts` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `insert_type` CHAR, `clr` CHAR, `priority` INT, `lmin` INT, `lmax` INT, `hmin` INT, `hmax` INT, `smin` FLOAT, `smax` FLOAT, `rmin` INT, `rmax` INT, `ahmin` INT, `ahmax` INT, `mmin` INT, `mmax` INT, `insert_glass_type` CHAR, `impost_fixation` CHAR, `shtulp_fixation` BOOLEAN, `can_rotate` BOOLEAN, `visualization` CHAR, `ts_specification` JSON, `ts_selection_params` JSON);\nCREATE TABLE IF NOT EXISTS `cat_cnns` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `priority` INT, `amin` INT, `amax` INT, `sd1` CHAR, `sd2` CHAR, `sz` FLOAT, `cnn_type` CHAR, `ahmin` INT, `ahmax` INT, `rmin` INT, `rmax` INT, `lmin` INT, `lmax` INT, `tmin` INT, `tmax` INT, `var_layers` BOOLEAN, `art1vert` BOOLEAN, `art1glass` BOOLEAN, `art2glass` BOOLEAN, `ts_specification` JSON, `ts_cnn_elmnts` JSON, `ts_selection_params` JSON);\nCREATE TABLE IF NOT EXISTS `cat_delivery_areas` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `country` CHAR, `region` CHAR, `city` CHAR, `latitude` FLOAT, `longitude` FLOAT, `ind` CHAR, `delivery_area` CHAR, `specify_area_by_geocoder` BOOLEAN);\nCREATE TABLE IF NOT EXISTS `cat_base_blocks` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `production` CHAR, `parent` CHAR, `svg` CHAR, `sys` CHAR, `ts_proportions` JSON, `ts_bindings` JSON, `ts_constructions` JSON, `ts_coordinates` JSON, `ts_params` JSON, `ts_cnn_elmnts` JSON);\nCREATE TABLE IF NOT EXISTS `cat_production_params` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `nom` CHAR, `default_clr` CHAR, `auto_align` BOOLEAN, `allow_open_cnn` BOOLEAN, `sz_lines` CHAR, `clr_group` CHAR, `is_drainage` BOOLEAN, `active` BOOLEAN, `tmin` INT, `tmax` INT, `lay_split_type` CHAR, `parent` CHAR, `ts_elmnts` JSON, `ts_product_params` JSON, `ts_furn` JSON, `ts_furn_params` JSON, `ts_colors` JSON);\nCREATE TABLE IF NOT EXISTS `cat_clrs` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `ral` CHAR, `machine_tools_clr` CHAR, `clr_str` CHAR, `clr_out` CHAR, `clr_in` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_cash_flow_articles` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `definition` CHAR, `РеквизитДопУпорядочивания` INT, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_cost_items` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `cost_kind` CHAR, `costs_material_feed` CHAR, `costs_character` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_cashboxes` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `funds_currency` CHAR, `department` CHAR, `current_account` CHAR, `owner` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_divisions` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `main_project` CHAR, `sorting` INT, `parent` CHAR, `ts_extra_fields` JSON);\nCREATE TABLE IF NOT EXISTS `cat_organizations` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `prefix` CHAR, `inn` CHAR, `individual_legal` CHAR, `main_bank_account` CHAR, `kpp` CHAR, `certificate_series_number` CHAR, `certificate_date_issue` Date, `certificate_authority_name` CHAR, `certificate_authority_code` CHAR, `individual_entrepreneur` CHAR, `ts_contact_information` JSON, `ts_extra_fields` JSON);\nCREATE TABLE IF NOT EXISTS `cat_stores` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `note` CHAR, `department` CHAR, `parent` CHAR, `ts_extra_fields` JSON);\nCREATE TABLE IF NOT EXISTS `cat_contracts` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `settlements_currency` CHAR, `mutual_settlements` CHAR, `contract_kind` CHAR, `date` Date, `check_days_without_pay` BOOLEAN, `allowable_debts_amount` FLOAT, `allowable_debts_days` INT, `note` CHAR, `check_debts_amount` BOOLEAN, `check_debts_days` BOOLEAN, `number_doc` CHAR, `organization` CHAR, `main_cash_flow_article` CHAR, `main_project` CHAR, `accounting_reflect` BOOLEAN, `tax_accounting_reflect` BOOLEAN, `prepayment_percent` FLOAT, `validity` Date, `vat_included` BOOLEAN, `price_type` CHAR, `vat_consider` BOOLEAN, `days_without_pay` INT, `owner` CHAR, `parent` CHAR);\nCREATE TABLE IF NOT EXISTS `cat_partners` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `name_full` CHAR, `main_bank_account` CHAR, `note` CHAR, `kpp` CHAR, `okpo` CHAR, `inn` CHAR, `individual_legal` CHAR, `main_contract` CHAR, `identification_document` CHAR, `buyer_main_manager` CHAR, `is_buyer` BOOLEAN, `is_supplier` BOOLEAN, `primary_contact` CHAR, `parent` CHAR, `ts_contact_information` JSON, `ts_extra_fields` JSON);\nCREATE TABLE IF NOT EXISTS `cat_characteristics` (ref CHAR PRIMARY KEY NOT NULL, `deleted` BOOLEAN, lc_changed INT, id CHAR, name CHAR, is_folder BOOLEAN, `x` FLOAT, `y` FLOAT, `z` FLOAT, `s` FLOAT, `clr` CHAR, `weight` FLOAT, `condition_products` FLOAT, `calc_order` CHAR, `product` INT, `leading_product` CHAR, `leading_elm` INT, `note` CHAR, `number_str` CHAR, `owner` CHAR, `sys` CHAR, `ts_constructions` JSON, `ts_coordinates` JSON, `ts_cnn_elmnts` JSON, `ts_params` JSON, `ts_glass_specification` JSON, `ts_extra_fields` JSON, `ts_glasses` JSON, `ts_mosquito` JSON, `ts_specification` JSON);\n","toolbar_calc_order_production.xml":"<?xml version=\"1.0\" encoding='utf-8'?>\r\n<toolbar>\r\n\r\n    <item id=\"sep0\" type=\"separator\"/>\r\n\r\n    <item type=\"buttonSelect\" id=\"bs_grp_add\" text=\"&lt;i class='fa fa-plus-circle fa-lg'&gt;&lt;/i&gt;\" title=\"Добавить строку заказа\" openAll=\"true\" >\r\n        <item type=\"button\" id=\"btn_add_builder\" text=\"&lt;i class='fa fa-object-ungroup fa-lg'&gt;&lt;/i&gt; Изделие построителя\" />\r\n        <item type=\"button\" id=\"btn_add_product\" text=\"&lt;i class='fa fa-gavel fa-lg'&gt;&lt;/i&gt; Продукцию или услугу\" />\r\n        <item type=\"button\" id=\"btn_add_material\" text=\"&lt;i class='fa fa-cube fa-lg'&gt;&lt;/i&gt; Материал\" />\r\n    </item>\r\n\r\n    <item type=\"button\" id=\"btn_edit\" text=\"&lt;i class='fa fa-object-ungroup fa-lg'&gt;&lt;/i&gt;\" title=\"Редактировать изделие построителя\" />\r\n    <item type=\"button\" id=\"btn_delete\" text=\"&lt;i class='fa fa-times fa-lg'&gt;&lt;/i&gt;\" title=\"Удалить строку заказа\" />\r\n\r\n    <item type=\"button\" id=\"btn_discount\" text=\"&lt;i class='fa fa-percent fa-lg'&gt;&lt;/i&gt;\" title=\"Скидки по типам строк заказа\"/>\r\n\r\n    <item id=\"sep1\" type=\"separator\"/>\r\n\r\n</toolbar>","toolbar_calc_order_obj.xml":"<?xml version=\"1.0\" encoding='utf-8'?>\r\n<toolbar>\r\n    <item id=\"sep0\" type=\"separator\"/>\r\n    <item type=\"button\" id=\"btn_sent\" text=\"&lt;i class='fa fa-paper-plane-o fa-lg fa-fw'&gt;&lt;/i&gt; Отправить\" title=\"Отправить заказ\" />\r\n    <item type=\"button\" id=\"btn_save\" text=\"&lt;i class='fa fa-floppy-o fa-lg fa-fw'&gt;&lt;/i&gt;\" title=\"Рассчитать и записать данные\"/>\r\n\r\n    <item type=\"button\" id=\"btn_post\" enabled=\"false\" text=\"&lt;i class='fa fa-check-square-o fa-lg fa-fw'&gt;&lt;/i&gt;\" title=\"Провести документ\" />\r\n    <item type=\"button\" id=\"btn_unpost\" enabled=\"false\" text=\"&lt;i class='fa fa-square-o fa-lg fa-fw'&gt;&lt;/i&gt;\" title=\"Отмена проведения\" />\r\n\r\n    <item type=\"button\" id=\"btn_files\" text=\"&lt;i class='fa fa-paperclip fa-lg fa-fw'&gt;&lt;/i&gt;\" title=\"Присоединенные файлы\"/>\r\n\r\n    <item type=\"buttonSelect\" id=\"bs_print\" text=\"&lt;i class='fa fa-print fa-lg fa-fw'&gt;&lt;/i&gt;\" title=\"Печать\" openAll=\"true\">\r\n    </item>\r\n\r\n    <item type=\"buttonSelect\" id=\"bs_create_by_virtue\" text=\"&lt;i class='fa fa-bolt fa-lg fa-fw'&gt;&lt;/i&gt;\" title=\"Создать на основании\" openAll=\"true\" >\r\n        <item type=\"button\" id=\"btn_message\" enabled=\"false\" text=\"Сообщение\" />\r\n    </item>\r\n\r\n    <item type=\"buttonSelect\" id=\"bs_go_to\" text=\"&lt;i class='fa fa-external-link fa-lg fa-fw'&gt;&lt;/i&gt;\" title=\"Перейти\" openAll=\"true\" >\r\n        <item type=\"button\" id=\"btn_go_connection\" enabled=\"false\" text=\"Связи\" />\r\n    </item>\r\n\r\n    <item type=\"buttonSelect\"   id=\"bs_more\"  text=\"&lt;i class='fa fa-th-large fa-lg fa-fw'&gt;&lt;/i&gt;\"  title=\"Дополнительно\" openAll=\"true\">\r\n        <item type=\"button\"     id=\"btn_retrieve\"    text=\"&lt;i class='fa fa-undo fa-lg fa-fw'&gt;&lt;/i&gt; Отозвать\" title=\"Отозвать заказ\" />\r\n        <item type=\"separator\"  id=\"sep_export\" />\r\n        <item type=\"button\" id=\"btn_import\" text=\"&lt;i class='fa fa-upload fa-lg fa-fw'&gt;&lt;/i&gt; Загрузить из файла\" />\r\n        <item type=\"button\" id=\"btn_export\" text=\"&lt;i class='fa fa-download fa-lg fa-fw'&gt;&lt;/i&gt; Выгрузить в файл\" />\r\n    </item>\r\n\r\n    <item id=\"sep_close_1\" type=\"separator\"/>\r\n    <item type=\"button\" id=\"btn_close\" text=\"&lt;i class='fa fa-times fa-lg fa-fw'&gt;&lt;/i&gt;\" title=\"Закрыть форму\"/>\r\n    <item id=\"sep_close_2\" type=\"separator\"/>\r\n\r\n</toolbar>","view_about.html":"<div class=\"md_column1300\">\r\n    <h1><i class=\"fa fa-info-circle\"></i> Интернет-магазин MetaStore</h1>\r\n    <p>Метамагазин - это веб-приложение с открытым исходным кодом, разработанное компанией <a href=\"http://www.oknosoft.ru/\" target=\"_blank\">Окнософт</a> на базе фреймворка <a href=\"http://www.oknosoft.ru/metadata/\" target=\"_blank\">Metadata.js</a> и распространяемое под <a href=\"http://www.oknosoft.ru/programmi-oknosoft/metadata.html\" target=\"_blank\">коммерческой лицензией Окнософт</a>.<br />\r\n        Исходный код и документация доступны на <a href=\"https://github.com/oknosoft/metastore\" target=\"_blank\">GitHub <i class=\"fa fa-github-alt\"></i></a>.<br />\r\n        Приложение является веб-интерфейсом к типовым конфигурациям 1С (Управление торговлей 11.2, Комплексная автоматизация 2.0, ERP Управление предприятием 2.1) и реализует функциональность интернет-магазина для информационной базы 1С\r\n    </p>\r\n    <p>Использованы следующие библиотеки и инструменты:</p>\r\n\r\n    <h3>Серверная часть</h3>\r\n    <ul>\r\n        <li><a href=\"http://1c-dn.com/1c_enterprise/\" target=\"_blank\">1c_enterprise</a><span class=\"md_muted_color\">, ORM сервер 1С:Предприятие</span></li>\r\n        <li><a href=\"http://www.postgresql.org/\" target=\"_blank\">postgreSQL</a><span class=\"md_muted_color\">, мощная объектно-раляционная база данных</span></li>\r\n        <li><a href=\"https://nodejs.org/\" target=\"_blank\">node.js</a><span class=\"md_muted_color\">, серверная программная платформа, основанная на движке V8 javascript</span></li>\r\n        <li><a href=\"http://nginx.org/ru/\" target=\"_blank\">nginx</a><span class=\"md_muted_color\">, высокопроизводительный HTTP-сервер</span></li>\r\n    </ul>\r\n\r\n    <h3>Управление данными в памяти браузера</h3>\r\n    <ul>\r\n        <li><a href=\"https://github.com/agershun/alasql\" target=\"_blank\">alaSQL</a><span class=\"md_muted_color\">, база данных SQL для браузера и Node.js с поддержкой как традиционных реляционных таблиц, так и вложенных JSON данных (NoSQL)</span></li>\r\n        <li><a href=\"https://github.com/metatribal/xmlToJSON\" target=\"_blank\">xmlToJSON</a><span class=\"md_muted_color\">, компактный javascript модуль для преобразования XML в JSON</span></li>\r\n        <li><a href=\"https://github.com/SheetJS/js-xlsx\" target=\"_blank\">xlsx</a><span class=\"md_muted_color\">, библиотека для чтения и записи XLSX / XLSM / XLSB / XLS / ODS в браузере</span></li>\r\n    </ul>\r\n\r\n    <h3>UI библиотеки и компоненты интерфейса</h3>\r\n    <ul>\r\n        <li><a href=\"http://dhtmlx.com/\" target=\"_blank\">dhtmlx</a><span class=\"md_muted_color\">, кроссбраузерная библиотека javascript для построения современных веб и мобильных приложений</span></li>\r\n        <li><a href=\"https://github.com/leongersen/noUiSlider\" target=\"_blank\">noUiSlider</a><span class=\"md_muted_color\">, легковесный javascript компонент регулирования пары (min-max) значений </span></li>\r\n        <li><a href=\"https://github.com/eligrey/FileSaver.js\" target=\"_blank\">filesaver.js</a><span class=\"md_muted_color\">, HTML5 реализация метода saveAs</span></li>\r\n        <li><a href=\"https://github.com/Diokuz/baron\" target=\"_blank\">baron</a><span class=\"md_muted_color\">, компонент управления полосами прокрутки</span></li>\r\n        <li><a href=\"https://github.com/ded/qwery\" target=\"_blank\">qwery</a><span class=\"md_muted_color\">, движок селекторов</span></li>\r\n        <li><a href=\"https://github.com/ded/bonzo\" target=\"_blank\">bonzo</a><span class=\"md_muted_color\">, утилиты DOM</span></li>\r\n        <li><a href=\"https://github.com/fat/bean\" target=\"_blank\">bean</a><span class=\"md_muted_color\">, библиотека событий для javascript</span></li>\r\n    </ul>\r\n\r\n    <h3>Графика</h3>\r\n    <ul>\r\n        <li><a href=\"https://fortawesome.github.io/Font-Awesome/\" target=\"_blank\">fontawesome</a><span class=\"md_muted_color\">, набор иконок и стилей CSS</span></li>\r\n        <li><a href=\"http://fontastic.me/\" target=\"_blank\">fontastic</a><span class=\"md_muted_color\">, еще один набор иконок и стилей</span></li>\r\n    </ul>\r\n\r\n    <p>&nbsp;</p>\r\n    <h2><i class=\"fa fa-question-circle\"></i> Вопросы</h2>\r\n    <p>Если обнаружили ошибку, пожалуйста,\r\n        <a href=\"https://github.com/oknosoft/metastore/issues/new\" target=\"_blank\">зарегистрируйте вопрос в GitHub</a> или\r\n        <a href=\"http://www.oknosoft.ru/metadata/#page-118\" target=\"_blank\">свяжитесь с разработчиком</a> напрямую<br />&nbsp;</p>\r\n\r\n</div>"});
/**
 * Ячейка грида для отображения картинки svg и компонент,
 * получающий и отображающий галерею эскизов объекта данных
 *
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author	Evgeniy Malyarov
 *
 * @module  wdg_rsvg
 * @requires common
 */

/**
 * Конструктор поля картинки svg
 */
function eXcell_rsvg(cell){ //the eXcell name is defined here
	if (cell){                // the default pattern, just copy it
		this.cell = cell;
		this.grid = this.cell.parentNode.grid;
	}
	this.edit = function(){};  //read-only cell doesn't have edit method
	this.isDisabled = function(){ return true; }; // the cell is read-only, so it's always in the disabled state
	this.setValue=function(val){
		this.setCValue(val ? $p.iface.scale_svg(val, 120, 10) : "нет эскиза");
	}
}
eXcell_rsvg.prototype = new eXcell();
window.eXcell_rsvg = eXcell_rsvg;

/**
 * ### Визуальный компонент OSvgs
 * Получает и отображает галерею эскизов объекта данных
 *
 * @class OSvgs
 * @param manager {DataManager}
 * @param layout {dhtmlXLayoutObject|dhtmlXWindowsCell}
 * @param area {HTMLElement}
 * @constructor
 */
$p.iface.OSvgs = function (manager, layout, area) {

	var t = this,
		minmax = document.createElement('div'),
		pics_area = document.createElement('div'),
		stack = [],
		area_hidden = $p.wsql.get_user_param("svgs_area_hidden", "boolean"),
		area_text = area.querySelector(".dhx_cell_statusbar_text");

	if(area_text)
		area_text.style.display = "none";

	pics_area.className = 'svgs-area';
	if(area.firstChild)
		area.insertBefore(pics_area, area.firstChild);
	else
		area.appendChild(pics_area);

	minmax.className = 'svgs-minmax';
	minmax.title="Скрыть/показать панель эскизов";
	minmax.onclick = function () {
		area_hidden = !area_hidden;
		$p.wsql.set_user_param("svgs_area_hidden", area_hidden);
		apply_area_hidden();

		if(!area_hidden && stack.length)
			t.reload();

	};
	area.appendChild(minmax);
	apply_area_hidden();

	function apply_area_hidden(){

		pics_area.style.display = area_hidden ? "none" : "";

		if(layout.setSizes)
			layout.setSizes();
		else if(layout.getDimension){
			var dim = layout.getDimension();
			layout.setDimension(dim[0], dim[1]);
			layout.maximize();
		}

		if(area_hidden){
			minmax.style.backgroundPositionX = "-32px";
			minmax.style.top = layout.setSizes ? "16px" : "-18px";
		}
		else{
			minmax.style.backgroundPositionX = "0px";
			minmax.style.top = "0px";
		}
	}

	function draw_svgs(res){

		var i, svg_elm;

		$p.iface.clear_svgs(pics_area);

		if(!res.svgs.length){
			// возможно, стоит показать надпись, что нет эскизов
		}else
			for(i in res.svgs){
				if(!res.svgs[i] || res.svgs[i].substr(0, 1) != "<")
					continue;
				svg_elm = document.createElement("div");
				pics_area.appendChild(svg_elm);
				svg_elm.style["float"] = "left";
				svg_elm.innerHTML = $p.iface.scale_svg(res.svgs[i], 88, 22);
			}
	}

	this.reload = function (ref) {

		if(ref)
			stack.push(ref);

		if(!area_hidden)
			setTimeout(function(){
				if(stack.length){
					manager.save({
							ref: stack.pop(),
							specify: "order_pics",
							action: "calc",
							async: true
						})
						.then(draw_svgs)
						.catch($p.record_log);
					stack.length = 0;
				}
			}, 300);
	}

};
/**
 * Главное окно интерфейса
 *
 * Created 25.12.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author Evgeniy Malyarov
 * @module wnd_main
 */

/**
 * Процедура устанавливает параметры работы программы, специфичные для текущей сборки
 * @param prm {Object} - в свойствах этого объекта определяем параметры работы программы
 * @param modifiers {Array} - сюда можно добавить обработчики, переопределяющие функциональность объектов данных
 */
$p.settings = function (prm, modifiers) {

	// разделитель для localStorage
	prm.local_storage_prefix = "wb_";

	//prm.rest = true;
	prm.irest_enabled = true;

	// расположение rest-сервиса ut
	prm.rest_path = "/a/zd/%1/odata/standard.odata/";

	// скин по умолчанию
	prm.skin = "dhx_terrace";

	prm.demo = {
		calc_order: "f0e9b97d-8396-408a-af14-b3b1c5849def",
		production: "8756eecf-f577-402c-86ce-74608d062a32"
	};
	localStorage.setItem("wb_base_blocks_folder", "20c5524b-7eab-11e2-be96-206a8a1a5bb0");// типовой блок по умолчанию

	// сокет временно отключаем
	// prm.ws_url = "ws://builder.oknosoft.local:8001";

	// по умолчанию, обращаемся к зоне 0
	prm.zone = 0;

	// расположение файлов данных
	prm.data_url = "data/";

	// используем геокодер
	prm.use_ip_geo = true;

	// полноэкранный режим на мобильных
	prm.request_full_screen = true;

	// разрешаем покидать страницу без лишних вопросов
	$p.eve.redirect = true;

};

$p.iface.oninit = function() {

	$p.iface.sidebar_items = [
		{id: "orders", text: "Заказы", icon: "projects_48.png"},
		{id: "events", text: "Календарь", icon: "events_48.png"},
		{id: "settings", text: "Настройки", icon: "settings_48.png"},
		{id: "about", text: "О программе", icon: "about_48.png"}
	];

	$p.iface.main = new dhtmlXSideBar({
		parent: document.body,
		icons_path: "dist/imgs/",
		width: 180,
		header: true,
		template: "tiles",
		autohide: true,
		items: $p.iface.sidebar_items,
		offsets: {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		}
	});


	// подписываемся на событие навигации по сайдбару
	$p.iface.main.attachEvent("onSelect", function(id){

		var hprm = $p.job_prm.parse_url();
		if(hprm.view != id)
			$p.iface.set_hash(hprm.obj, hprm.ref, hprm.frm, id);

		$p.iface["view_" + id]($p.iface.main.cells(id));

	});

	// активируем страницу
	hprm = $p.job_prm.parse_url();
	if(!hprm.view || $p.iface.main.getAllItems().indexOf(hprm.view) == -1){
		$p.iface.set_hash(hprm.obj, hprm.ref, hprm.frm, "orders");
	} else
		setTimeout($p.iface.hash_route, 10);

	var dt = Date.now();
	dhx4.attachEvent("meta", function () {
		console.log(Date.now() - dt);
	});

};

/**
 * Обработчик маршрутизации
 * @param hprm
 * @return {boolean}
 */
$p.eve.hash_route.push(function (hprm) {

	// view отвечает за переключение закладки в SideBar
	if(hprm.view && $p.iface.main.getActiveItem() != hprm.view){
		$p.iface.main.getAllItems().forEach(function(item){
			if(item == hprm.view)
				$p.iface.main.cells(item).setActive(true);
		});
	}
	return false;
});
/**
 *
 * Created 24.10.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author  Evgeniy Malyarov
 * @module  view_about
 */

$p.iface.view_about = function (cell) {

	function OViewAbout(){

		cell.attachHTMLString($p.injected_data['view_about.html']);
		cell.cell.querySelector(".dhx_cell_cont_sidebar").style.overflow = "auto";

		this.tb_nav = new $p.iface.OTooolBar({
			wrapper: cell.cell.querySelector(".dhx_cell_sidebar_hdr"),
			class_name: 'md_otbnav',
			width: '200px', height: '28px', top: '3px', right: '3px', name: 'right',
			buttons: [
				{name: 'about', text: '<i class="fa fa-info-circle md-fa-lg"></i>', title: 'О&nbsp;программе', float: 'right'},
				{name: 'settings', text: '<i class="fa fa-cog md-fa-lg"></i>', title: 'Настройки', float: 'right'},
				{name: 'events', text: '<i class="fa fa-calendar-check-o md-fa-lg"></i>', title: 'Календарь', float: 'right'},
				{name: 'orders', text: '<i class="fa fa-suitcase md-fa-lg"></i>', title: 'Заказы', float: 'right'}

			], onclick: function (name) {
				$p.iface.main.cells(name).setActive(true);
				return false;
			}
		});
	}

	if(!$p.iface._about)
		$p.iface._about = new OViewAbout();

	return $p.iface._about;

};

/**
 *
 * Created 24.10.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author  Evgeniy Malyarov
 * @module  view_events
 */

$p.iface.view_events = function (cell) {

	function OViewEvents(){
		cell.attachHTMLString($p.injected_data['view_about.html']);
		cell.cell.querySelector(".dhx_cell_cont_sidebar").style.overflow = "auto";

		this.tb_nav = new $p.iface.OTooolBar({
			wrapper: cell.cell.querySelector(".dhx_cell_sidebar_hdr"),
			class_name: 'md_otbnav',
			width: '200px', height: '28px', top: '3px', right: '3px', name: 'right',
			buttons: [
				{name: 'about', text: '<i class="fa fa-info-circle md-fa-lg"></i>', title: 'О&nbsp;программе', float: 'right'},
				{name: 'settings', text: '<i class="fa fa-cog md-fa-lg"></i>', title: 'Настройки', float: 'right'},
				{name: 'events', text: '<i class="fa fa-calendar-check-o md-fa-lg"></i>', title: 'Календарь', float: 'right'},
				{name: 'orders', text: '<i class="fa fa-suitcase md-fa-lg"></i>', title: 'Заказы', float: 'right'}

			], onclick: function (name) {
				$p.iface.main.cells(name).setActive(true);
				return false;
			}
		});

	}

	if(!$p.iface._events)
		$p.iface._events = new OViewEvents();

	return $p.iface._events;

};

/**
 *
 * Created 24.10.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author  Evgeniy Malyarov
 * @module  view_orders
 */

$p.iface.view_orders = function (cell) {

	function OViewOrders(){

		var t = this;

		function show_list(){

			var _cell = t.carousel.cells("list");

			if(t.carousel.getActiveCell() != _cell)
				_cell.setActive();

			if(!t.list){
				t.carousel.cells("list").detachObject(true);
				t.list = $p.doc.calc_order.form_list(t.carousel.cells("list"), {
					hide_header: true,
					date_from: new Date((new Date()).getFullYear().toFixed() + "-01-01"),
					date_till: new Date((new Date()).getFullYear().toFixed() + "-12-31")
				});
			}

		}

		function show_doc(ref){

			var _cell = t.carousel.cells("doc");

			if(t.carousel.getActiveCell() != _cell)
				_cell.setActive();

			if(!_cell.ref || _cell.ref != ref)
				$p.doc.calc_order.form_obj(_cell, {
						ref: ref,
						bind_pwnd: true,
						on_close: function () {
							setTimeout(function () {
								$p.iface.set_hash(undefined, "", "list");
							});
						}
					})
					.then(function (wnd) {
						t.doc = wnd;
					});
		}

		function show_builder(ref){

			var _cell = t.carousel.cells("builder");

			if(t.carousel.getActiveCell() != _cell)
				_cell.setActive();

			t.editor.open(ref);

		}

		function hash_route(hprm) {

			if(hprm.view == "orders"){

				if($p.eve.logged_in){

					if(hprm.obj == "doc.calc_order" && !$p.is_empty_guid(hprm.ref)){

						if(hprm.frm != "doc")
							setTimeout(function () {
								$p.iface.set_hash(undefined, undefined, "doc");
							});
						else
							show_doc(hprm.ref);


					} if(hprm.obj == "cat.characteristics" && !$p.is_empty_guid(hprm.ref)) {

						if(hprm.frm != "builder")
							setTimeout(function () {
								$p.iface.set_hash(undefined, undefined, "builder");
							});
						else
							show_builder(hprm.ref);


					}else if($p.is_empty_guid(hprm.ref) || hprm.frm == "list"){

						if(hprm.obj != "doc.calc_order")
							setTimeout(function () {
								$p.iface.set_hash("doc.calc_order");
							});
						else
							show_list();
					}
				}

				return false;
			}

		}

		function on_log_in(){

			// создадим экземпляр графического редактора
			var _cell = t.carousel.cells("builder"),
				hprm = $p.job_prm.parse_url(),
				obj = hprm.obj || "doc.calc_order";

			_cell._on_close = function () {

				_cell = t.carousel.cells("doc");

				if(!$p.is_empty_guid(_cell.ref))
					$p.iface.set_hash("doc.calc_order", _cell.ref, "doc");

				else{
					hprm = $p.job_prm.parse_url();
					obj = $p.cat.characteristics.get(hprm.ref, false, true);
					if(obj && !$p.is_empty_guid(obj.calc_order.ref))
						$p.iface.set_hash("doc.calc_order", obj.calc_order.ref, "doc");
					else
						$p.iface.set_hash("doc.calc_order", "", "list");
				}

			}

			t.editor = new $p.Editor(_cell);

			setTimeout(function () {
				$p.iface.set_hash(obj);
			});
		}

		// Рисуем дополнительные элементы навигации
		t.tb_nav = new $p.iface.OTooolBar({
			wrapper: cell.cell.querySelector(".dhx_cell_sidebar_hdr"),
			class_name: 'md_otbnav',
			width: '220px', height: '28px', top: '3px', right: '3px', name: 'right',
			buttons: [
				{name: 'about', text: '<i class="fa fa-info-circle md-fa-lg"></i>', title: 'О&nbsp;программе', float: 'right'},
				{name: 'settings', text: '<i class="fa fa-cog md-fa-lg"></i>', title: 'Настройки', float: 'right'},
				{name: 'events', text: '<i class="fa fa-calendar-check-o md-fa-lg"></i>', title: 'Календарь', float: 'right'},
				{name: 'orders', text: '<i class="fa fa-suitcase md-fa-lg"></i>', title: 'Заказы', float: 'right'}

				//{name: 'filter', text: '<i class="fa fa-filter md-fa-lg"></i>', title: 'Фильтр', float: 'left'}

			], onclick: function (name) {
				if(['settings', 'about', 'events'].indexOf(name) != -1)
					$p.iface.main.cells(name).setActive(true);
				else {

				}
				return false;
			}
		});

		// страницы карусели
		t.carousel = cell.attachCarousel({
			keys:           false,
			touch_scroll:   false,
			offset_left:    0,
			offset_top:     4,
			offset_item:    0
		});
		t.carousel.hideControls();
		t.carousel.addCell("list");
		t.carousel.addCell("doc");
		t.carousel.addCell("builder");


		// Рисуем стандартную форму аутентификации. К ней уже привязан алгоритм входа по умолчанию
		// При необходимости, можно реализовать клиентские сертификаты, двухфакторную авторизацию с одноразовыми sms и т.д.
		if($p.eve.logged_in)
			setTimeout(on_log_in);
		else
			$p.iface.frm_auth({	cell: t.carousel.cells("list") }, null, $p.record_log );


		/**
		 * Обработчик маршрутизации
		 * @param hprm
		 * @return {boolean}
		 */
		$p.eve.hash_route.push(hash_route);


		// слушаем событие online-offline


		// слушаем событие авторизации и входа в систему
		$p.eve.attachEvent("log_in", on_log_in);

	}

	if(!$p.iface._orders)
		$p.iface._orders = new OViewOrders();

	return $p.iface._orders;

};

/**
 *
 * Created 24.10.2015<br />
 * &copy; http://www.oknosoft.ru 2014-2015
 * @author  Evgeniy Malyarov
 * @module  view_settings
 */

$p.iface.view_settings = function (cell) {

	function OViewSettings(){
		cell.attachHTMLString($p.injected_data['view_about.html']);
		cell.cell.querySelector(".dhx_cell_cont_sidebar").style.overflow = "auto";

		this.tb_nav = new $p.iface.OTooolBar({
			wrapper: cell.cell.querySelector(".dhx_cell_sidebar_hdr"),
			class_name: 'md_otbnav',
			width: '200px', height: '28px', top: '3px', right: '3px', name: 'right',
			buttons: [
				{name: 'about', text: '<i class="fa fa-info-circle md-fa-lg"></i>', title: 'О&nbsp;программе', float: 'right'},
				{name: 'settings', text: '<i class="fa fa-cog md-fa-lg"></i>', title: 'Настройки', float: 'right'},
				{name: 'events', text: '<i class="fa fa-calendar-check-o md-fa-lg"></i>', title: 'Календарь', float: 'right'},
				{name: 'orders', text: '<i class="fa fa-suitcase md-fa-lg"></i>', title: 'Заказы', float: 'right'}


			], onclick: function (name) {
				$p.iface.main.cells(name).setActive(true);
				return false;
			}
		});

	}

	if(!$p.iface._settings)
		$p.iface._settings = new OViewSettings();

	return $p.iface._settings;

};

return undefined;
}));