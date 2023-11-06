{
    'variables': {
        'arch': ["<!(node -e \"console.log(process.arch);\")"],
    },
    "targets": [
        {
            'target_name': "docrectifier",
            'sources': ["src/docrectifier.cc"],
            'include_dirs': [
                "include"
            ],
            'conditions': [
                ['OS=="linux"', {
                    'defines': [
                        'LINUX_DOCRECTIFIER',
                    ],

                    "cflags": [
                        "-std=c++11"
                    ],
                    'ldflags': [
                        "-Wl,-rpath,'$$ORIGIN'"
                    ],

                    'libraries': [
                        "-lDynamsoftCorex64", "-lDynamsoftDocumentNormalizerx64", "-L../lib/linux"
                    ],
                    'copies': [
                        {
                            'destination': 'build/Release/',
                            'files': [
                                './lib/linux/libDynamicImage.so',
                                './lib/linux/libDynamicPdf.so',
                                './lib/linux/libDynamicPdfCore.so',
                                './lib/linux/libDynamsoftCore.so',
                                './lib/linux/libDynamsoftDocumentNormalizer.so',
                                './lib/linux/libDynamsoftImageProcessing.so',
                                './lib/linux/libDynamsoftIntermediateResult.so',
                            ]
                        }
                    ]
                }],
                ['OS=="win"', {
                    'defines': [
                        'WINDOWS_DOCRECTIFIER',
                    ],
                    'libraries': [
                        "-l../lib/windows/DynamsoftCorex64.lib", "-l../lib/windows/DynamsoftDocumentNormalizerx64.lib"
                    ],
                    'copies': [
                        {
                            'destination': 'build/Release/',
                            'files': [
                                './lib/windows/DynamicImagex64.dll',
                                './lib/windows/DynamicPdfCorex64.dll',
                                './lib/windows/DynamicPdfx64.dll',
                                './lib/windows/DynamsoftCorex64.dll',
                                './lib/windows/DynamsoftDocumentNormalizerx64.dll',
                                './lib/windows/DynamsoftImageProcessingx64.dll',
                                './lib/windows/DynamsoftIntermediateResultx64.dll',
                                './lib/windows/vcomp140.dll',
                            ]
                        }
                    ],
                }]
            ]
        }
    ]
}
