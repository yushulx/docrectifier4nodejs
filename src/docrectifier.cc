#include <node.h>
#include <node_buffer.h>
#include <string.h>
#include <uv.h>
#include "docrectifier.h"

using namespace v8;

#define DocRectifier_NO_MEMORY 0
#define DocRectifier_SUCCESS 1
#define DEFAULT_MEMORY_SIZE 4096

typedef enum
{
	NO_BUFFER,
	RGB_BUFFER,
} BufferType;

struct DetectWorker
{
	void *handler;
	uv_work_t request;				   // libuv
	Persistent<Function> callback;	   // javascript callback
	char filename[128];				   // file name
	DetectedQuadResultArray *pResults; // result pointer
	unsigned char *buffer;
	int size;			   // file size
	int errorCode;		   // detection error code
	int width;			   // image width
	int height;			   // image height
	BufferType bufferType; // buffer type
	int stride;			   // image stride
};

struct NormalizeWorker
{
	DocRectifier *obj;
	uv_work_t request;			   // libuv
	Persistent<Function> callback; // javascript callback
	char filename[128];			   // file name
	unsigned char *buffer;
	int size;			   // file size
	int errorCode;		   // detection error code
	int width;			   // image width
	int height;			   // image height
	BufferType bufferType; // buffer type
	int stride;			   // image stride
	int x1, y1, x2, y2, x3, y3, x4, y4;
};

void binary2grayscale(unsigned char *data, unsigned char *output, int width, int height, int stride, int length)
{
	int index = 0;

	int skip = stride * 8 - width;
	int shift = 0;
	int n = 1;

	for (int i = 0; i < length; ++i)
	{
		unsigned char b = data[i];
		int byteCount = 7;
		while (byteCount >= 0)
		{
			int tmp = (b & (1 << byteCount)) >> byteCount;

			if (shift < stride * 8 * n - skip)
			{
				if (tmp == 1)
					output[index] = 255;
				else
					output[index] = 0;
				index += 1;
			}

			byteCount -= 1;
			shift += 1;
		}

		if (shift == stride * 8 * n)
		{
			n += 1;
		}
	}
}

/*
 *	uv_work_cb
 */
static void DetectionWorking(uv_work_t *req)
{
	// get the reference to DetectWorker
	DetectWorker *worker = static_cast<DetectWorker *>(req->data);
	if (!worker->handler)
	{
		printf("DocRectifier handler not initialized.\n");
		return;
	}

	// initialize Dynamsoft Label Recognizer
	DetectedQuadResultArray *pResults = NULL;

	// decode document image
	int ret = 0;
	switch (worker->bufferType)
	{
	case RGB_BUFFER:
	{
		if (worker->buffer)
		{
			int width = worker->width, height = worker->height, stride = worker->stride;
			ImagePixelFormat format = IPF_RGB_888;

			if (width == stride)
			{
				format = IPF_GRAYSCALED;
			}
			else if (((width * 3 + 3) & ~3) == stride)
			{
				format = IPF_RGB_888;
			}
			else if (width * 4 == stride)
			{
				format = IPF_ARGB_8888;
			}

			ImageData data;
			data.bytes = worker->buffer;
			data.width = width;
			data.height = height;
			data.stride = stride;
			data.format = format;
			data.bytesLength = stride * height;
			data.orientation = 0;

			ret = DDN_DetectQuadFromBuffer(worker->handler, &data, "", &pResults);
		}
		break;
	}
	default:
	{
		ret = DDN_DetectQuadFromFile(worker->handler, worker->filename, "", &pResults);
	}
	}

	if (ret)
	{
		printf("Detection error: %s\n", DC_GetErrorString(ret));
	}

	// save results to DetectWorker
	worker->errorCode = ret;
	worker->pResults = pResults;
}

/*
 *	uv_after_work_cb
 */
static void DetectionDone(uv_work_t *req, int status)
{
	Isolate *isolate = Isolate::GetCurrent();
	HandleScope scope(isolate);
	Local<Context> context = isolate->GetCurrentContext();

	// get the reference to DetectWorker
	DetectWorker *worker = static_cast<DetectWorker *>(req->data);

	// get document results
	DetectedQuadResultArray *pResults = worker->pResults;
	int errorCode = worker->errorCode;

	// array for storing document results
	Local<Array> documentResults = Array::New(isolate);

	if (pResults)
	{
		int count = pResults->resultsCount;
		for (int i = 0; i < count; i++)
		{
			DetectedQuadResult *quadResult = pResults->detectedQuadResults[i];
			int confidence = quadResult->confidenceAsDocumentBoundary;
			DM_Point *points = quadResult->location->points;
			int x1 = points[0].coordinate[0];
			int y1 = points[0].coordinate[1];
			int x2 = points[1].coordinate[0];
			int y2 = points[1].coordinate[1];
			int x3 = points[2].coordinate[0];
			int y3 = points[2].coordinate[1];
			int x4 = points[3].coordinate[0];
			int y4 = points[3].coordinate[1];

			Local<Object> result = Object::New(isolate);
			result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "confidence", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, confidence));
			result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "x1", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, x1));
			result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "y1", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, y1));
			result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "x2", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, x2));
			result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "y2", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, y2));
			result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "x3", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, x3));
			result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "y3", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, y3));
			result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "x4", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, x4));
			result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "y4", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, y4));
			documentResults->Set(context, Number::New(isolate, i), result);
		}

		// release memory of document results
		DDN_FreeDetectedQuadResultArray(&pResults);
	}

	// run the callback
	const unsigned argc = 2;
	Local<Number> err = Number::New(isolate, errorCode);
	Local<Value> argv[argc] = {err, documentResults};
	Local<Function> cb = Local<Function>::New(isolate, worker->callback);
	cb->Call(context, Null(isolate), argc, argv);

	// release memory of DetectWorker
	delete worker;
}

/*
 *	uv_work_cb
 */
static void NormalizeWorking(uv_work_t *req)
{
	// get the reference to DetectWorker
	NormalizeWorker *worker = static_cast<NormalizeWorker *>(req->data);
	if (!worker->obj->handler)
	{
		printf("DocRectifier handler not initialized.\n");
		return;
	}

	worker->obj->FreeImage();

	Quadrilateral quad;
	quad.points[0].coordinate[0] = worker->x1;
	quad.points[0].coordinate[1] = worker->y1;
	quad.points[1].coordinate[0] = worker->x2;
	quad.points[1].coordinate[1] = worker->y2;
	quad.points[2].coordinate[0] = worker->x3;
	quad.points[2].coordinate[1] = worker->y3;
	quad.points[3].coordinate[0] = worker->x4;
	quad.points[3].coordinate[1] = worker->y4;

	// normalize document image
	int ret = 0;
	switch (worker->bufferType)
	{
	case RGB_BUFFER:
	{
		if (worker->buffer)
		{
			int width = worker->width, height = worker->height, stride = worker->stride;
			ImagePixelFormat format = IPF_RGB_888;

			if (width == stride)
			{
				format = IPF_GRAYSCALED;
			}
			else if (((width * 3 + 3) & ~3) == stride)
			{
				format = IPF_RGB_888;
			}
			else if (width * 4 == stride)
			{
				format = IPF_ARGB_8888;
			}

			ImageData data;
			data.bytes = worker->buffer;
			data.width = width;
			data.height = height;
			data.stride = stride;
			data.format = format;
			data.bytesLength = stride * height;
			data.orientation = 0;

			ret = DDN_NormalizeBuffer(worker->obj->handler, &data, "", &quad, &worker->obj->imageResult);
		}
		break;
	}
	default:
	{
		ret = DDN_NormalizeFile(worker->obj->handler, worker->filename, "", &quad, &worker->obj->imageResult);
	}
	}

	if (ret)
	{
		printf("Detection error: %s\n", DC_GetErrorString(ret));
	}

	// save results to DetectWorker
	worker->errorCode = ret;
}

/*
 *	uv_after_work_cb
 */
static void NormalizeDone(uv_work_t *req, int status)
{
	Isolate *isolate = Isolate::GetCurrent();
	HandleScope scope(isolate);
	Local<Context> context = isolate->GetCurrentContext();

	// get the reference to NormalizeWorker
	NormalizeWorker *worker = static_cast<NormalizeWorker *>(req->data);

	// get document results
	int errorCode = worker->errorCode;
	Local<Object> result = Object::New(isolate);

	if (worker->obj->imageResult)
	{
		ImageData *imageData = worker->obj->imageResult->image;
		int width = imageData->width;
		int height = imageData->height;
		int stride = imageData->stride;
		int format = (int)imageData->format;
		unsigned char *data = imageData->bytes;
		int orientation = imageData->orientation;
		int length = imageData->bytesLength;

		result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "width", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, width));
		result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "height", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, height));
		result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "stride", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, stride));
		result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "format", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, format));
		result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "orientation", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, orientation));
		result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "length", NewStringType::kNormal).ToLocalChecked(), Number::New(isolate, length));

		unsigned char *rgba = (unsigned char *)calloc(width * height * 4, sizeof(unsigned char));

		if (format == IPF_RGB_888)
		{
			int dataIndex = 0;
			for (int i = 0; i < height; i++)
			{
				for (int j = 0; j < width; j++)
				{
					int index = i * width + j;

					rgba[index * 4] = data[dataIndex];		   // red
					rgba[index * 4 + 1] = data[dataIndex + 1]; // green
					rgba[index * 4 + 2] = data[dataIndex + 2]; // blue
					rgba[index * 4 + 3] = 255;				   // alpha
					dataIndex += 3;
				}
			}
		}
		else if (format == IPF_GRAYSCALED)
		{
			int dataIndex = 0;
			for (int i = 0; i < height; i++)
			{
				for (int j = 0; j < width; j++)
				{
					int index = i * width + j;
					rgba[index * 4] = data[dataIndex];
					rgba[index * 4 + 1] = data[dataIndex];
					rgba[index * 4 + 2] = data[dataIndex];
					rgba[index * 4 + 3] = 255;
					dataIndex += 1;
				}
			}
		}
		else if (format == IPF_BINARY)
		{
			unsigned char *grayscale = (unsigned char *)calloc(width * height, sizeof(unsigned char));
			binary2grayscale(data, grayscale, width, height, stride, length);

			int dataIndex = 0;
			for (int i = 0; i < height; i++)
			{
				for (int j = 0; j < width; j++)
				{
					int index = i * width + j;
					rgba[index * 4] = grayscale[dataIndex];
					rgba[index * 4 + 1] = grayscale[dataIndex];
					rgba[index * 4 + 2] = grayscale[dataIndex];
					rgba[index * 4 + 3] = 255;
					dataIndex += 1;
				}
			}

			free(grayscale);
		}

		std::vector<uint8_t> rawBytes(rgba, rgba + width * height * 4);
		result->DefineOwnProperty(context, String::NewFromUtf8(isolate, "data", NewStringType::kNormal).ToLocalChecked(), node::Buffer::Copy(isolate, (char *)rawBytes.data(), rawBytes.size()).ToLocalChecked());
		free(rgba);
	}

	// run the callback
	const unsigned argc = 2;
	Local<Number> err = Number::New(isolate, errorCode);
	Local<Value> argv[argc] = {err, result};
	Local<Function> cb = Local<Function>::New(isolate, worker->callback);
	cb->Call(context, Null(isolate), argc, argv);

	// release memory of DetectWorker
	delete worker;
}

/*
 *	initLicense(license)
 */
void InitLicense(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = args.GetIsolate();
	Local<Context> context = isolate->GetCurrentContext();

	String::Utf8Value license(isolate, args[0]);
	char *pszLicense = *license;
	char errorMsgBuffer[512];
	// Click https://www.dynamsoft.com/customer/license/trialLicense/?product=DocRectifier to get a trial license.
	int ret = DC_InitLicense(pszLicense, errorMsgBuffer, 512);
	printf("InitLicense: %s\n", errorMsgBuffer);
	args.GetReturnValue().Set(Number::New(isolate, ret));
}

/*
 *	detectFileAsync(fileName, callback)
 */
void DocRectifier::DetectFileAsync(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = args.GetIsolate();
	DocRectifier *obj = ObjectWrap::Unwrap<DocRectifier>(args.Holder());
	Local<Context> context = isolate->GetCurrentContext();

	// get arguments
	String::Utf8Value fileName(isolate, args[0]); // file name
	char *pFileName = *fileName;
	Local<Function> cb = Local<Function>::Cast(args[1]); // javascript callback function

	// initialize DetectWorker
	DetectWorker *worker = new DetectWorker;
	worker->handler = obj->handler;
	worker->request.data = worker;
	strcpy(worker->filename, pFileName);
	worker->callback.Reset(isolate, cb);
	worker->pResults = NULL;
	worker->buffer = NULL;
	worker->bufferType = NO_BUFFER;

	uv_queue_work(uv_default_loop(), &worker->request, (uv_work_cb)DetectionWorking, (uv_after_work_cb)DetectionDone);
}

/*
 *	detectBufferAsync(buffer, width, height, stride, callback)
 */
void DocRectifier::DetectBufferAsync(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = Isolate::GetCurrent();
	DocRectifier *obj = ObjectWrap::Unwrap<DocRectifier>(args.Holder());
	Local<Context> context = isolate->GetCurrentContext();

	// get arguments
	unsigned char *buffer = (unsigned char *)node::Buffer::Data(args[0]); // buffer
	int width = args[1]->Int32Value(context).ToChecked();				  // image width
	int height = args[2]->Int32Value(context).ToChecked();				  // image height
	int stride = args[3]->Int32Value(context).ToChecked();				  // stride
	Local<Function> cb = Local<Function>::Cast(args[4]);				  // javascript callback function

	// initialize DetectWorker
	DetectWorker *worker = new DetectWorker;
	worker->handler = obj->handler;
	worker->request.data = worker;
	worker->callback.Reset(isolate, cb);
	worker->pResults = NULL;
	worker->buffer = buffer;
	worker->width = width;
	worker->height = height;
	worker->bufferType = RGB_BUFFER;
	worker->stride = stride;

	uv_queue_work(uv_default_loop(), &worker->request, (uv_work_cb)DetectionWorking, (uv_after_work_cb)DetectionDone);
}

/*
 *	GetVersionNumber()
 *
 *	returns the SDK version number.
 */
void GetVersionNumber(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = Isolate::GetCurrent();
	args.GetReturnValue().Set(String::NewFromUtf8(
								  isolate, DDN_GetVersion())
								  .ToLocalChecked());
}

DocRectifier::DocRectifier()
{
	handler = DDN_CreateInstance();
	imageResult = NULL;
}

DocRectifier::~DocRectifier()
{
	DDN_DestroyInstance(handler);

	FreeImage();
}

void DocRectifier::FreeImage()
{
	if (imageResult != NULL)
	{
		DDN_FreeNormalizedImageResult(&imageResult);
		imageResult = NULL;
	}
}

void DocRectifier::Init(Local<Object> exports)
{
	Isolate *isolate = exports->GetIsolate();
	Local<Context> context = isolate->GetCurrentContext();

	Local<ObjectTemplate> addon_data_tpl = ObjectTemplate::New(isolate);
	addon_data_tpl->SetInternalFieldCount(1); // 1 field for the DocRectifier::New()
	Local<Object> addon_data =
		addon_data_tpl->NewInstance(context).ToLocalChecked();

	// Prepare constructor template
	Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate, New, addon_data);
	tpl->SetClassName(String::NewFromUtf8(isolate, "DocRectifier").ToLocalChecked());
	tpl->InstanceTemplate()->SetInternalFieldCount(1);

	// Prototype
	NODE_SET_PROTOTYPE_METHOD(tpl, "getParameters", GetParameters);
	NODE_SET_PROTOTYPE_METHOD(tpl, "setParameters", SetParameters);
	NODE_SET_PROTOTYPE_METHOD(tpl, "save", Save);
	NODE_SET_PROTOTYPE_METHOD(tpl, "detectFileAsync", DetectFileAsync);
	NODE_SET_PROTOTYPE_METHOD(tpl, "detectBufferAsync", DetectBufferAsync);
	NODE_SET_PROTOTYPE_METHOD(tpl, "normalizeBufferAsync", NormalizeBufferAsync);
	NODE_SET_PROTOTYPE_METHOD(tpl, "normalizeFileAsync", NormalizeFileAsync);

	Local<Function> constructor = tpl->GetFunction(context).ToLocalChecked();
	addon_data->SetInternalField(0, constructor);
	exports->Set(context, String::NewFromUtf8(isolate, "DocRectifier").ToLocalChecked(),
				 constructor)
		.FromJust();
}

void DocRectifier::New(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = args.GetIsolate();
	Local<Context> context = isolate->GetCurrentContext();

	if (args.IsConstructCall())
	{
		// Invoked as constructor: `new DocRectifier(...)`
		DocRectifier *obj = new DocRectifier();
		obj->Wrap(args.This());
		args.GetReturnValue().Set(args.This());
	}
	else
	{
		// Invoked as plain function `DocRectifier(...)`, turn into construct call.
		const int argc = 1;
		Local<Value> argv[argc] = {args[0]};
		Local<Function> cons =
			args.Data().As<Object>()->GetInternalField(0).As<Function>();
		Local<Object> result =
			cons->NewInstance(context, argc, argv).ToLocalChecked();
		args.GetReturnValue().Set(result);
	}
}

void DocRectifier::SetParameters(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = args.GetIsolate();
	DocRectifier *obj = ObjectWrap::Unwrap<DocRectifier>(args.Holder());

	String::Utf8Value params(isolate, args[0]);
	char errorMsgBuffer[512];
	int ret = DDN_InitRuntimeSettingsFromString(obj->handler, *params, errorMsgBuffer, 512);
	if (ret != DM_OK)
	{
		printf("%s\n", errorMsgBuffer);
	}

	args.GetReturnValue().Set(Number::New(isolate, ret));
}

void DocRectifier::GetParameters(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = args.GetIsolate();

	DocRectifier *obj = ObjectWrap::Unwrap<DocRectifier>(args.Holder());

	char *content = NULL;
	DDN_OutputRuntimeSettingsToString(obj->handler, "", &content);

	args.GetReturnValue().Set(String::NewFromUtf8(
								  isolate, content)
								  .ToLocalChecked());

	if (content != NULL)
		DDN_FreeString(&content);
}

void DocRectifier::Save(const FunctionCallbackInfo<Value> &args)
{

	Isolate *isolate = args.GetIsolate();
	DocRectifier *obj = ObjectWrap::Unwrap<DocRectifier>(args.Holder());
	String::Utf8Value fileName(isolate, args[0]);

	int ret = DMERR_UNKNOWN;
	if (obj->imageResult)
	{
		ret = NormalizedImageResult_SaveToFile(obj->imageResult, *fileName);
		if (ret != DM_OK)
			printf("NormalizedImageResult_SaveToFile: %s\r\n", DC_GetErrorString(ret));
	}

	args.GetReturnValue().Set(Number::New(isolate, ret));
}

void DocRectifier::NormalizeBufferAsync(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = Isolate::GetCurrent();
	DocRectifier *obj = ObjectWrap::Unwrap<DocRectifier>(args.Holder());
	Local<Context> context = isolate->GetCurrentContext();

	// get arguments
	unsigned char *buffer = (unsigned char *)node::Buffer::Data(args[0]);
	int width = args[1]->Int32Value(context).ToChecked();
	int height = args[2]->Int32Value(context).ToChecked();
	int stride = args[3]->Int32Value(context).ToChecked();
	int x1 = args[4]->Int32Value(context).ToChecked();
	int y1 = args[5]->Int32Value(context).ToChecked();
	int x2 = args[6]->Int32Value(context).ToChecked();
	int y2 = args[7]->Int32Value(context).ToChecked();
	int x3 = args[8]->Int32Value(context).ToChecked();
	int y3 = args[9]->Int32Value(context).ToChecked();
	int x4 = args[10]->Int32Value(context).ToChecked();
	int y4 = args[11]->Int32Value(context).ToChecked();
	Local<Function> cb = Local<Function>::Cast(args[12]);

	// initialize NormalizeWorker
	NormalizeWorker *worker = new NormalizeWorker;
	worker->request.data = worker;
	worker->callback.Reset(isolate, cb);
	worker->buffer = buffer;
	worker->width = width;
	worker->height = height;
	worker->bufferType = RGB_BUFFER;
	worker->stride = stride;
	worker->obj = obj;
	worker->x1 = x1;
	worker->y1 = y1;
	worker->x2 = x2;
	worker->y2 = y2;
	worker->x3 = x3;
	worker->y3 = y3;
	worker->x4 = x4;
	worker->y4 = y4;

	uv_queue_work(uv_default_loop(), &worker->request, (uv_work_cb)NormalizeWorking, (uv_after_work_cb)NormalizeDone);
}

void DocRectifier::NormalizeFileAsync(const FunctionCallbackInfo<Value> &args)
{
	Isolate *isolate = args.GetIsolate();
	DocRectifier *obj = ObjectWrap::Unwrap<DocRectifier>(args.Holder());
	Local<Context> context = isolate->GetCurrentContext();

	// get arguments
	String::Utf8Value fileName(isolate, args[0]); // file name
	char *pFileName = *fileName;
	int x1 = args[1]->Int32Value(context).ToChecked();
	int y1 = args[2]->Int32Value(context).ToChecked();
	int x2 = args[3]->Int32Value(context).ToChecked();
	int y2 = args[4]->Int32Value(context).ToChecked();
	int x3 = args[5]->Int32Value(context).ToChecked();
	int y3 = args[6]->Int32Value(context).ToChecked();
	int x4 = args[7]->Int32Value(context).ToChecked();
	int y4 = args[8]->Int32Value(context).ToChecked();
	Local<Function> cb = Local<Function>::Cast(args[9]);
	// initialize NormalizeWorker
	NormalizeWorker *worker = new NormalizeWorker;
	worker->request.data = worker;
	strcpy(worker->filename, pFileName);
	worker->callback.Reset(isolate, cb);
	worker->buffer = NULL;
	worker->bufferType = NO_BUFFER;
	worker->obj = obj;
	worker->x1 = x1;
	worker->y1 = y1;
	worker->x2 = x2;
	worker->y2 = y2;
	worker->x3 = x3;
	worker->y3 = y3;
	worker->x4 = x4;
	worker->y4 = y4;

	uv_queue_work(uv_default_loop(), &worker->request, (uv_work_cb)NormalizeWorking, (uv_after_work_cb)NormalizeDone);
}

void Init(Local<Object> exports)
{
	NODE_SET_METHOD(exports, "initLicense", InitLicense);
	NODE_SET_METHOD(exports, "getVersionNumber", GetVersionNumber);
	DocRectifier::Init(exports);
}

NODE_MODULE(DocRectifier, Init)