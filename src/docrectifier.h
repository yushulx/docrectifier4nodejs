#ifndef DocRectifierSCANNER_H
#define DocRectifierSCANNER_H

#include <node.h>
#include <node_object_wrap.h>

#include "DynamsoftCore.h"
#include "DynamsoftDocumentNormalizer.h"
// https://nodejs.org/api/addons.html
class DocRectifier : public node::ObjectWrap
{
public:
  static void Init(v8::Local<v8::Object> exports);
  void *handler;
  NormalizedImageResult *imageResult;

  void FreeImage();

private:
  explicit DocRectifier();
  ~DocRectifier();

  static void New(const v8::FunctionCallbackInfo<v8::Value> &args);
  static void GetParameters(const v8::FunctionCallbackInfo<v8::Value> &args);
  static void SetParameters(const v8::FunctionCallbackInfo<v8::Value> &args);
  static void Save(const v8::FunctionCallbackInfo<v8::Value> &args);
  static void DetectFileAsync(const v8::FunctionCallbackInfo<v8::Value> &args);
  static void DetectBufferAsync(const v8::FunctionCallbackInfo<v8::Value> &args);
  static void NormalizeBufferAsync(const v8::FunctionCallbackInfo<v8::Value> &args);
  static void NormalizeFileAsync(const v8::FunctionCallbackInfo<v8::Value> &args);
};

#endif