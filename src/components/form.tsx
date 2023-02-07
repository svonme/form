/**
 * @file 动态表单
 * @author svon.me@gmail.com
 */

import _ from "lodash-es";
import { Comp } from "../config";
import { useValidate } from "src/utils";
import safeSet from "@fengqiaogang/safe-set";
import safeGet from "@fengqiaogang/safe-get";
import { Form, FormItem, Button, Space, Input, Col, Row } from "ant-design-vue";
import { PropType, h as createElement, defineComponent, toRaw, computed, ref } from "vue";

import type { Component } from "vue";
import type { ModalFuncProps } from "ant-design-vue";
import type { FormItemData, FormOptionValue, Props } from "types/form";

interface FormState {
  [key: string]: any;
}

// 初始化表达数据
const initData = function(form: FormOptionValue) {
  const data: FormState = {};
  for(const item of _.flattenDeep(_.concat(form))) {
    if (item.key) {
      safeSet(data, item.key, item.value);
    }
  }
  return data;
}

const getComp = function(item: FormItemData, state: FormState, change: (value: FormState) => void) {
  const props = { state, ..._.pick(item, ["meta", "disabled"]) };
  const onUpdate = function(value: FormState) {
    change({ ...toRaw(state), ...value });
  }
  const onChange = function(value: string | number | Array<string | number>) {
    if (item.key) {
      if (typeof value === "object" && !Array.isArray(value)) {
        const target = safeGet<HTMLInputElement>(value, "target");
        onUpdate({ [item.key]: safeGet<string>(target, "value") || "" });
      } else {
        onUpdate({ [item.key]: value });
      }
    }
  };
  if (item.key) {
    safeSet(props, "meta.key", item.key);
    const value = safeGet<any>(state, item.key) || void 0;
    _.assign(props, { value });
  }
  _.assign(props, { "onUpdate:state": onUpdate, onChange });
  if (item.component) {
    if (typeof item.component === "string") {
      const value = Comp.get(item.component);
      if (value) {
        return createElement(value, props);
      }
    }
    return createElement(item.component as any, props);
  }
  return createElement(Input, props);
}

enum Layout {
  horizontal = "horizontal",
  vertical = "vertical",
  inline = "inline"
}

export default defineComponent({
  name: "UiForm",
  props: {
    value: {
      type: Object as PropType<FormState>,
      default () {
        return {};
      }
    },
    items: {
      required: true,
      type: [Array, Object] as PropType<FormOptionValue>
    },
    option: {
      type: Object as PropType<ModalFuncProps>,
      default () {
        return {};
      }
    },
    layout: {
      type: String as PropType<string | Layout>,
      default () {
        return Layout.vertical;
      }
    },
    class: {
      type: String,
      default: ""
    },
    buttons: {
      type: Boolean as PropType<boolean | Component>,
      default: () => true
    }
  },
  setup (props: Props<FormState, Layout>, { expose, slots, emit }) {
    const { formRef, validate } = useValidate();
    const state = ref<FormState>({ ...toRaw(props.value || {}), ...initData(props.items) });
    const onStateChange = function(value: FormState) {
      state.value = value;
      emit("update:value", toRaw(value));
    };

    const config = computed<ModalFuncProps>(function() {
      return _.assign({
        okText: "Submit",
        cancelText: "Cancel"
      }, props.option);
    });

    const onCancel = function() {
      emit("cancel");
    };
    const onSubmit = function () {
      return validate(function() {
        return toRaw(state.value);
      });
    }
    const onClick = async function(e: Event) {
      const value = await onSubmit();
      if (value) {
        emit("submit", e, value);
      }
    }
    expose({ onSubmit, validate });

    const getButtons = function() {
      if (_.isBoolean(props.buttons)) {
        if (slots.buttons) {
          return slots.buttons();
        }
        return (<div style={{ "padding-top": "12px", "text-align": "center" }}>
          <Space>
            <Button onClick={ onCancel }>{ config.value.cancelText }</Button>
            <Button type="primary" onClick={onClick}>{ config.value.okText }</Button>
          </Space>
        </div>);
      }
      return props.buttons;
    };

    return () => {
      const renderForm = function(value: FormOptionValue): Component | undefined {
        if (_.isArray(value)) {
          return (<div>
            <Row gutter={ 24 }>
              {
                _.map(value as FormItemData[], (item: FormItemData) =>{
                  const span = Math.ceil(24 / _.size(value));
                  if (_.isArray(item)) {
                    return (<Col span={ span }>{ renderForm(_.flatten(item)) }</Col>);
                  }
                  return <Col span={ span }>{ renderForm(item) }</Col>;
                })
              }
            </Row>
          </div>);
        }
        const data = value as FormItemData;
        if (data) {
          let label;
          const className: string[] = [];
          if (data.className && _.isString(data.className)) {
            className.push(data.className);
          }
          if (data.className && _.isArray(data.className)) {
            className.push(...data.className);
          }
          if (_.isNil(data.lable) === false) {
            label = data.lable ? data.lable : (<span>&nbsp;</span>);
          }
          if (data.from === false) {
            const opt = { "class": className };
            return createElement("div", opt, getComp(data, state.value, onStateChange));
          } else {
            const opt = { "class": className, name: data.key, rules: data.rules };
            const slots = { label, default: getComp(data, state.value, onStateChange) };
            return createElement(FormItem, opt, slots);
          }
        }
      }
      return (<div>
        <div class={ props.class }>
          <Form ref={ formRef } layout={ props.layout as Layout } model={ state.value }>
            { renderForm(props.items) }
          </Form>
        </div>
        { props.buttons && getButtons() }
      </div>);
    };
  },
});
