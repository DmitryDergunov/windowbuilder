
import React from 'react';
import PropTypes from 'prop-types';
import Typography from '@material-ui/core/Typography';
import Bar from './Bar';
import TabularSection from 'metadata-react/TabularSection';
import AddIcon from '@material-ui/icons/AddCircleOutline';
import RemoveIcon from '@material-ui/icons/DeleteOutline';
import ArrowUpIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownIcon from '@material-ui/icons/ArrowDownward';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import GlassLayerProps from './GlassLayerProps';

const reflect = ({project, reflect_grp}) => {
  if(reflect_grp) {
    reflect_grp();
  }
  else if(project){
    project.register_change(true);
  }
};

export default class GlassComposite extends React.Component {

  constructor(props, context) {
    super(props, context);
    const {cat, utils} = $p;
    this._meta = utils._clone(cat.characteristics.metadata('glass_specification'));
    cat.scheme_settings.find_rows({obj: 'cat.characteristics.glass_specification'}, (scheme) => {
      if(!this.scheme || scheme.name.endsWith('main')) {
        this.scheme = scheme;
      }
    });
  }

  componentDidMount() {
    $p.cat.characteristics.on('update', this.value_change);
  }

  componentWillUnmount() {
    $p.cat.characteristics.off('update', this.value_change);
  }

  shouldComponentUpdate({elm}) {
    const {props, _grid} = this;
    if(_grid && props.elm !== elm) {
      setTimeout(() => {
        const row = _grid.rowGetter(0);
        if(row) {
          props.set_row(row);
          _grid._grid.selectCell({rowIdx: 0, idx: 0}, false);
        }
      });
    }
    return true;
  }

  value_change = (obj, flds) => {
    if(obj instanceof $p.CatCharacteristicsGlass_specificationRow && ('inset' in flds || 'dop' in flds)) {
      reflect(this.props.elm);
    }
  };

  filter = (collection) => {
    const {elm} = this.props.elm;
    const res = [];
    collection.find_rows({elm}, (row) => {
      res.push(row);
    });
    return res;
  };

  handleAdd = () => {
    const {_grid, props} = this;
    const {ox, elm} = props.elm;

    const row = ox.glass_specification.add({elm});

    //selectRow
    if(_grid) {
      _grid.handleFilterChange();
      for (let i = 0; i < row.row; i++) {
        if(_grid.rowGetter(i) === row) {
          setTimeout(() => _grid._grid.selectCell({rowIdx: i, idx: 0}, true));
          break;
        }
      }
    }
  };

  handleRemove = () => {
    const {_grid, props: {elm}} = this;
    if(_grid) {
      const {selected} = _grid.state;
      if(selected && selected.hasOwnProperty('rowIdx')) {
        _grid.handleRemove();
        reflect(elm);
        _grid.rowGetter(0) && setTimeout(() => {
          _grid._grid.selectCell({rowIdx: 0, idx: 0}, false);
        });
      }
    }
  };

  handleUp = () => {
    const {_grid, props: {elm}} = this;
    if(_grid) {
      _grid.handleUp();
      reflect(elm);
    }
  };

  handleDown = () => {
    const {_grid, props: {elm}} = this;
    if(_grid) {
      _grid.handleDown();
      reflect(elm);
    }
  };

  Toolbar = (props) => {
    const {width} = props;
    return <Toolbar disableGutters style={{width: width || '100%'}}>
      <IconButton title="Добавить вставку" onClick={this.handleAdd}><AddIcon /></IconButton>
      <IconButton title="Удалить строку" onClick={this.handleRemove}><RemoveIcon /></IconButton>
      <IconButton disabled>|</IconButton>
      <IconButton title="Переместить вверх" onClick={this.handleUp}><ArrowUpIcon/></IconButton>
      <IconButton title="Переместить вниз" onClick={this.handleDown}><ArrowDownIcon/></IconButton>
    </Toolbar>;
  };

  handleRef = (el) => {
    this._grid = el;
  };

  handleCellSelected = (sel, row) => {
    if(!row && sel && sel.hasOwnProperty('rowIdx')) {
      row = this._grid.rowGetter(sel.rowIdx);
    }
    this.props.set_row(row);
  };

  render() {

    const {props: {elm, row}}  = this;

    return <>
      <Bar>Составной пакет</Bar>
      {this.scheme ? <>
        <div style={{height: 320}}>
          <TabularSection
            ref={this.handleRef}
            _obj={elm.ox}
            _meta={this._meta}
            _tabular="glass_specification"
            scheme={this.scheme}
            filter={this.filter}
            disable_cache
            denyAddDel
            Toolbar={this.Toolbar}
            onCellSelected={this.handleCellSelected}
          />
        </div>
        <GlassLayerProps elm={elm} row={row}/>
      </>
      :
        <Typography color="error">
          {`Не найден элемент scheme_settings {obj: "cat.characteristics.glass_specification", name: "glass_specification.main"}`}
        </Typography>}
    </>;
  }
}

GlassComposite.propTypes = {
  elm: PropTypes.object, // элемент составного заполнения
  row: PropTypes.object, // строка состава
};
