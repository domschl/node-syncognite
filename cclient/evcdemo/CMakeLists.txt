add_executable(evcdemo evcdemo.c)
find_library(ZMQ_LIB zmq)
target_link_libraries(evcdemo LINK_PUBLIC ${ZMQ_LIB} evcclient)
