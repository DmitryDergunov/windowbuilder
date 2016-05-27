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
			return "SELECT _t_.ref, _t_.`_deleted`, _t_.is_folder, _t_.id, _t_.name as presentation, _k_.synonym as contract_kind, _m_.synonym as mutual_settlements, _o_.name as organization, _p_.name as partner," +
				" case when _t_.ref = '" + initial_value + "' then 0 else 1 end as is_initial_value FROM cat_contracts AS _t_" +
				" left outer join cat_organizations as _o_ on _o_.ref = _t_.organization" +
				" left outer join cat_partners as _p_ on _p_.ref = _t_.owner" +
				" left outer join enm_mutual_contract_settlements as _m_ on _m_.ref = _t_.mutual_settlements" +
				" left outer join enm_contract_kinds as _k_ on _k_.ref = _t_.contract_kind %3 %4 LIMIT 300";
		};

		_mgr.by_partner_and_org = function (partner, organization, contract_kind) {
			if(!contract_kind)
				contract_kind = $p.enm.contract_kinds.СПокупателем;
			var res = _mgr.find_rows({owner: partner, organization: organization, contract_kind: contract_kind});
			res.sort(function (a, b) {
				return a.date > b.date;
			});
			return res.length ? res[0] : _mgr.get();
		};

		// перед записью, устанавливаем код, родителя и наименование
		_mgr.attache_event("before_save", function (attr) {

			// уточняем родителя
			if(!this._obj.parent)
				this.parent = $p.blank.guid;

			// уточняем вид договора
			if(!this._obj.contract_kind)
				this.contract_kind = $p.enm.contract_kinds.СПокупателем;

			// уточняем ведение взаиморасчетов
			if(!this._obj.mutual_settlements)
				this.mutual_settlements = $p.enm.mutual_contract_settlements.ПоЗаказам;

			// уточняем наименование
			if(!this.name){
				this.name = "Основной";
			}

			// присваиваем код
			if(!this.id){
				var prefix = ($p.current_acl.prefix || "") + ($p.wsql.get_user_param("zone") + "-"),
					code_length = this._metadata.code_length - prefix.length,
					part = "",
					res = $p.wsql.alasql("select max(id) as id from ? where id like '" + prefix + "%'", [_mgr.alatable]);

				// TODO: вынести в отдельную функцию

				if(res.length){
					var num0 = res[0].id || "";
					for(var i = num0.length-1; i>0; i--){
						if(isNaN(parseInt(num0[i])))
							break;
						part = num0[i] + part;
					}
					part = (parseInt(part || 0) + 1).toFixed(0);
				}else{
					part = "1";
				}
				while (part.length < code_length)
					part = "0" + part;

				this.id = prefix + part;
			}
			



		});

	}
);