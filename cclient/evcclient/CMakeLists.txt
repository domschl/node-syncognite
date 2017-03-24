add_library(evcclient STATIC evcclient.c)
target_include_directories(evcclient PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
